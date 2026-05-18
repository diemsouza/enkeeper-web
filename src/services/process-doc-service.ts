import {
  findDocById,
  findActiveOrPausedDocsByUser,
  updateDoc,
} from "../repo/docs.repo";
import { formatInvalidContentMessage } from "../core/validate-content";
import { createActivity, updateActivity } from "../repo/activities.repo";
import { createQuestions } from "../repo/questions.repo";
import { createSection } from "../repo/sections.repo";
import {
  archiveOrCancelActivitiesByDoc,
  buildPreviousActivitySummary,
} from "./activity-service";
import {
  generateDocSections,
  generateSectionQuestions,
} from "../vendors/llm.vendor";
import { findUserChannelByUserId } from "../repo/users.repo";
import { saveMessage } from "../repo/messages.repo";
import {
  sendWhatsAppMessage,
  sendWhatsAppMessages,
} from "../vendors/whatsapp.vendor";
import { incrementDailyDocCount } from "../repo/daily-usage.repo";
import {
  formatDocProcessed,
  formatDocProcessingFailed,
  formatDocNoQuestions,
} from "../core/formatters";
import {
  FIRST_MESSAGE_INTERVAL_MIN,
  NEXT_MESSAGE_INTERVAL_MIN,
  MAX_DOCS_PER_DAY,
} from "../lib/constants";
import { sanitizeText } from "../lib/utils";
import {
  getFormatsBySectionType,
  getQuestionExamples,
} from "../core/format-loader";
import { QuestionFormat } from "@prisma/client";
import { shuffle } from "lodash";
import { SectionQuestionResult } from "../lib/llm-schemas";

export async function processDoc(docId: string, userId: string): Promise<void> {
  const doc = await findDocById(docId, userId);
  if (!doc) {
    console.warn(`[process-doc] doc not found: ${docId}`);
    return;
  }

  const result = await generateDocSections({
    rawContent: doc.rawContent,
    docType: doc.docType,
    userId,
    docId,
  });

  if (!result) {
    console.error(`[process-doc] AI failed for doc ${docId}`);
    await updateDoc(docId, userId, { status: "failed" });
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg = formatDocProcessingFailed();
      await sendWhatsAppMessage(userChannel.channelId, msg);
      await saveMessage({
        userId,
        userChannelId: userChannel.id,
        role: "assistant",
        content: msg,
        intent: "system_error",
      });
    }
    return;
  }

  if (!result.isValid) {
    await updateDoc(docId, userId, { status: "failed" });
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg = formatInvalidContentMessage(result.invalidReason);
      await sendWhatsAppMessage(userChannel.channelId, msg);
      await saveMessage({
        userId,
        userChannelId: userChannel.id,
        role: "assistant",
        content: msg,
        intent: "system_error",
      });
    }
    return;
  }

  const combinedContent = result.sections.map((s) => s.content).join("\n\n");

  await updateDoc(docId, userId, {
    title: result.title,
    content: combinedContent,
    level: result.level,
    status: "active",
  });

  const otherDocs = await findActiveOrPausedDocsByUser(userId);
  for (const other of otherDocs) {
    if (other.id !== docId) {
      await updateDoc(other.id, userId, { status: "archived" });
    }
    await archiveOrCancelActivitiesByDoc(other.id, userId);
  }

  const now = new Date();
  const intervalMinutes = NEXT_MESSAGE_INTERVAL_MIN;
  const nextMessageAt = new Date(
    now.getTime() + FIRST_MESSAGE_INTERVAL_MIN * 60 * 1000,
  );
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const activity = await createActivity({
    userId,
    docId,
    date,
    nextMessageAt,
    intervalMinutes,
    status: "active",
  });

  let totalQuestions = 0;
  let hasWarning = false;

  for (const sectionData of [...result.sections].sort(
    (a, b) => a.order - b.order,
  )) {
    const section = await createSection({
      userId,
      docId,
      activityId: activity.id,
      sectionType: sectionData.sectionType,
      title: sanitizeText(sectionData.title),
      content: sanitizeText(sectionData.content),
      order: sectionData.order,
    });

    const exampleFormats = getFormatsBySectionType(sectionData.sectionType);
    const questionExamples = getQuestionExamples(exampleFormats, result.level);

    let questions = await generateSectionQuestions({
      sectionType: sectionData.sectionType,
      sectionTitle: sectionData.title,
      sectionContent: sectionData.content,
      level: result.level,
      questionExamples: questionExamples,
      userId,
      docId,
      sectionId: section.id,
    });

    // Validação anti-vazamento entre itens adjacentes (só vocabulary).
    // sourceItem é o "ponteiro" declarado pelo modelo pro item da lista
    // que ele está cobrindo. Pra ser válido:
    // - recall_inverted: sourceItem deve aparecer na pergunta (ex: "O que significa 'blanket'?")
    // - demais formatos: sourceItem deve estar no answerKeys
    // Se não bater, descarta. sourceItem removido antes de salvar (auditoria).
    if (questions && sectionData.sectionType === "vocabulary") {
      const valid = questions
        .filter((q) => {
          const source = q.sourceItem?.toLowerCase().trim();
          if (!source) return false;
          if (q.warning) {
            console.warn(
              `[gen-vocabulary] Pergunta descartada por warning: ${q.warning}. Q: ${q.question} A: ${q.answerKeys}`,
            );
            hasWarning = true;
            return false;
          }

          if (q.questionFormat === "recall_inverted") {
            // sourceItem aparece NA pergunta (entre aspas)
            return q.question.toLowerCase().includes(source);
          }

          // demais formatos: sourceItem está no answerKeys
          const keys = q.answerKeys.map((k) => k.toLowerCase().trim());
          return keys.includes(source);
        })
        .map(({ sourceItem, ...rest }) => rest);

      const discarded = questions.length - valid.length;
      if (discarded > 0) {
        console.warn(
          `[gen-vocabulary] ${discarded}/${questions.length} perguntas descartadas por sourceItem inconsistente`,
        );
      }

      questions = valid as SectionQuestionResult;
    }

    if (questions && questions.length > 0) {
      questions = shuffle(questions); // embaralha perguntas dentro da seção pra evitar padrão
      await createQuestions(
        activity.id,
        section.id,
        questions.map((q) => {
          return {
            question: sanitizeText(q.question),
            answerKeys: q.answerKeys.map((k) => sanitizeText(k)),
            questionFormat: q.questionFormat as QuestionFormat,
            questionOptions: q.questionFormat
              ? shuffle(q.questionOptions.map((o) => sanitizeText(o)))
              : undefined,
          };
        }),
      );

      totalQuestions += questions.length;
    }
  }

  if (totalQuestions > 0) {
    await updateActivity(activity.id, userId, {
      questionCount: totalQuestions,
      sectionCount: result.sections.length,
    });
    const docCount = await incrementDailyDocCount(userId, date);
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg = formatDocProcessed(hasWarning, MAX_DOCS_PER_DAY - docCount);
      const summary = await buildPreviousActivitySummary(userId);
      const messages = summary ? [msg, summary] : [msg];
      await sendWhatsAppMessages(userChannel.channelId, messages);
      for (const content of messages) {
        await saveMessage({
          userId,
          userChannelId: userChannel.id,
          role: "assistant",
          content,
        });
      }
    }
  } else {
    await updateDoc(docId, userId, { status: "failed" });
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg = formatDocNoQuestions();
      await sendWhatsAppMessage(userChannel.channelId, msg);
      await saveMessage({
        userId,
        userChannelId: userChannel.id,
        role: "assistant",
        content: msg,
        intent: "system_error",
      });
    }
  }
}
