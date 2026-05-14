import {
  findDocById,
  findActiveOrPausedDocsByUser,
  updateDoc,
} from "../repo/docs.repo";
import { formatInvalidContentMessage } from "../core/validate-content";
import { createActivity, updateActivity } from "../repo/activities.repo";
import { createQuestions } from "../repo/questions.repo";
import { createSection } from "../repo/sections.repo";
import { archiveOrCancelActivitiesByDoc } from "./activity-service";
import {
  generateDocSections,
  generateSectionQuestions,
} from "../vendors/llm.vendor";
import { findUserChannelByUserId } from "../repo/users.repo";
import { saveMessage } from "../repo/messages.repo";
import { sendWhatsAppMessage } from "../vendors/whatsapp.vendor";
import {
  FIRST_MESSAGE_INTERVAL_MIN,
  NEXT_MESSAGE_INTERVAL_MIN,
} from "../lib/constants";
import { sanitizeText } from "../lib/utils";
import {
  getFormatsBySectionType,
  getQuestionExamples,
} from "../core/question-format";
import { QuestionFormat } from "@prisma/client";

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

    const questions = await generateSectionQuestions({
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
      await createQuestions(
        activity.id,
        section.id,
        questions.map((q) => {
          return {
            question: sanitizeText(q.question),
            answerKeys: q.answerKeys.map((k) => sanitizeText(k)),
            questionFormat: q.questionFormat as QuestionFormat,
            questionOptions: q.questionOptions?.map((o) => sanitizeText(o)),
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
  }
}
