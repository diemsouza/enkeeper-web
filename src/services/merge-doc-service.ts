import {
  findDocById,
  findActiveOrPausedDocsByUser,
  updateDoc,
} from "../repo/docs.repo";
import { findDocItemsByDoc } from "../repo/doc-items.repo";
import { formatInvalidContentMessage, validateContent } from "../core/validate-content";
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
import { findUserById, findUserChannelByUserId, updateUserPendingIntent } from "../repo/users.repo";
import { saveMessage } from "../repo/messages.repo";
import {
  sendWhatsAppMessage,
  sendWhatsAppMessages,
} from "../vendors/whatsapp.vendor";
import { incrementDailyActivityCount } from "../repo/daily-usage.repo";
import {
  formatLevelQuestion,
  formatDocProcessed,
  formatDocProcessingFailed,
  formatDocNoQuestions,
} from "../core/formatters";
import {
  FIRST_MESSAGE_INTERVAL_MIN,
  NEXT_MESSAGE_INTERVAL_MIN,
  MAX_ACTIVITIES_PER_DAY,
} from "../lib/constants";
import { sanitizeText } from "../lib/utils";
import {
  getFormatsBySectionType,
  getQuestionExamples,
  validateGeneratedQuestion,
} from "../core/format-loader";
import { DocType, QuestionFormat } from "../lib/prisma";
import { shuffle } from "lodash";
import { shuffleQuestions } from "../core/utils";

export async function mergeDoc(
  docId: string,
  userId: string,
  latestDocItemId: string,
): Promise<void> {
  const doc = await findDocById(docId, userId);
  if (!doc || doc.status !== "pending") {
    return;
  }

  const allItems = await findDocItemsByDoc(docId);
  const lastItem = allItems[allItems.length - 1];
  if (!lastItem || lastItem.id !== latestDocItemId) {
    return;
  }

  const validItems = allItems.filter((item) => !item.error);
  if (validItems.length === 0) {
    const error = "Nenhum item válido para processar.";
    await updateDoc(docId, userId, { status: "failed", error });
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
    return;
  }

  const types = Array.from(new Set(validItems.map((i) => i.docType)));
  const docType: DocType = types.length === 1 ? types[0] : "mixed";
  const consolidatedRaw = validItems.map((item) => item.rawContent).join("\n\n");

  const user = await findUserById(userId);
  if (!user) return;

  if (user.level === null) {
    await updateDoc(docId, userId, { rawContent: consolidatedRaw, docType });
    await updateUserPendingIntent(userId, "awaiting_level_set");
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg = formatLevelQuestion();
      await sendWhatsAppMessage(userChannel.channelId, msg);
      await saveMessage({
        userId,
        userChannelId: userChannel.id,
        role: "assistant",
        content: msg,
        intent: "awaiting_level_set",
      });
    }
    return;
  }

  try {
    const contentValidation = validateContent(consolidatedRaw);
    if (!contentValidation.isValid) {
      await updateDoc(docId, userId, {
        status: "failed",
        error: contentValidation.invalidReason ?? "Conteúdo inválido.",
      });
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatInvalidContentMessage(contentValidation.invalidReason);
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

    const result = await generateDocSections({
      rawContent: consolidatedRaw,
      docType,
      userId,
      docId,
    });

    if (!result) {
      console.error(`[merge-doc] AI failed for doc ${docId}`);
      await updateDoc(docId, userId, {
        status: "failed",
        error: "Falha na extração de conteúdo.",
      });
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
      await updateDoc(docId, userId, {
        status: "failed",
        error: result.invalidReason ?? "Conteúdo inválido.",
      });
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
      rawContent: consolidatedRaw,
      content: combinedContent,
      level: result.level,
      status: "active",
      docType,
    });

    const userLevel = user.level ?? result.level;

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
      userLevel,
      title: result.title ?? "",
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

      if (questions && questions.length > 0) {
        const { questions: validatedQuestions, hasWarning: validatedHasWarning } =
          validateGeneratedQuestion(questions, sectionData.sectionType);
        questions = validatedQuestions;
        hasWarning = hasWarning || validatedHasWarning;
      }

      if (questions && questions.length > 0) {
        questions = shuffleQuestions(questions);
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
      const activityCount = await incrementDailyActivityCount(userId, date);
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatDocProcessed(
          hasWarning,
          MAX_ACTIVITIES_PER_DAY - activityCount,
        );
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
      await updateDoc(docId, userId, {
        status: "failed",
        error: "Nenhuma pergunta gerada.",
      });
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
  } catch (err) {
    console.error(`[merge-doc] unexpected error for doc ${docId}`, err);
    await updateDoc(docId, userId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Erro inesperado.",
    });
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
  }
}
