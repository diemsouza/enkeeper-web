import { findDocById, updateDoc } from "../repo/docs.repo";
import { findDocItemsByDoc } from "../repo/doc-items.repo";
import {
  formatInvalidContentMessage,
  validateContent,
} from "../core/validate-content";
import {
  createActivity,
  findCurrentActivityByUser,
  findLastActiveActivityByUser,
} from "../repo/activities.repo";
import {
  archiveOrCancelActivity,
  buildPreviousActivitySummary,
} from "./activity-service";
import { generateDocSections } from "../vendors/llm.vendor";
import { findUserById } from "../repo/users.repo";
import { MessageChannel } from "../types/message-channel";
import { incrementDailyActivityCount } from "../repo/daily-usage.repo";
import {
  formatDocProcessed,
  formatDocProcessingFailed,
  formatDocNoQuestions,
} from "../core/formatters";
import {
  FIRST_MESSAGE_INTERVAL_MIN,
  NEXT_MESSAGE_INTERVAL_MIN,
  MAX_ACTIVITIES_PER_DAY,
  DEFAULT_MESSAGE_INTERVAL_SEC,
} from "../lib/constants";
import { sanitizeText } from "../lib/utils";
import { sendAndSaveMessage, waitBeforeSend } from "./message-sender-service";
import { sendFirstQuestionNow } from "./activity-cron.service";
import { calculatePoolSize } from "../core/pool-size";
import { DocType } from "../lib/prisma";

export async function mergeDoc(
  docId: string,
  userId: string,
  latestDocItemId: string,
  channel: MessageChannel,
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
  const activeActivity = await findLastActiveActivityByUser(userId);

  const validItems = allItems.filter((item) => !item.error);
  if (validItems.length === 0) {
    const error = "Nenhum item válido para processar.";
    await updateDoc(docId, userId, { status: "failed", error });
    const msg = formatDocNoQuestions();
    await sendAndSaveMessage({
      channel,
      userId,
      activityId: activeActivity?.id,
      message: msg,
      intent: "system_error",
    });
    return;
  }

  const types = Array.from(new Set(validItems.map((i) => i.docType)));
  const docType: DocType = types.length === 1 ? types[0] : "mixed";
  const consolidatedRaw = validItems
    .map((item) => item.rawContent)
    .join("\n\n");

  const user = await findUserById(userId);
  if (!user) return;

  try {
    const contentValidation = validateContent(consolidatedRaw);
    if (!contentValidation.isValid) {
      await updateDoc(docId, userId, {
        status: "failed",
        error: contentValidation.invalidReason ?? "Conteúdo inválido.",
      });
      const msg = formatInvalidContentMessage(
        contentValidation.invalidReason,
      );
      await sendAndSaveMessage({
        channel,
        userId,
        activityId: activeActivity?.id,
        message: msg,
        intent: "system_error",
      });
      return;
    }

    await channel.notifyTyping(userId);
    const docSectionResult = await generateDocSections({
      rawContent: consolidatedRaw,
      docType,
      userId,
      docId,
    });

    if (!docSectionResult) {
      console.error(`[mergeDoc] AI failed for doc ${docId}`);
      await updateDoc(docId, userId, {
        status: "failed",
        error: "Falha na extração de conteúdo.",
      });
      const msg = formatDocProcessingFailed();
      await sendAndSaveMessage({
        channel,
        userId,
        activityId: activeActivity?.id,
        message: msg,
        intent: "system_error",
      });
      return;
    }

    if (!docSectionResult.isValid) {
      await updateDoc(docId, userId, {
        status: "failed",
        error: docSectionResult.invalidReason ?? "Conteúdo inválido.",
      });
      const msg = formatInvalidContentMessage(docSectionResult.invalidReason);
      await sendAndSaveMessage({
        channel,
        userId,
        activityId: activeActivity?.id,
        message: msg,
        intent: "system_error",
      });
      return;
    }

    const combinedContent = docSectionResult.content;

    await updateDoc(docId, userId, {
      title: docSectionResult.title,
      rawContent: consolidatedRaw,
      content: combinedContent,
      level: docSectionResult.level,
      status: "active",
      docType,
    });

    const userLevel = user.level ?? docSectionResult.level;

    const currentActivity = await findCurrentActivityByUser(userId);
    if (currentActivity) {
      await archiveOrCancelActivity(currentActivity, userId);
    }

    const now = new Date();
    const intervalMinutes = NEXT_MESSAGE_INTERVAL_MIN;
    const nextMessageAt = new Date(
      now.getTime() + FIRST_MESSAGE_INTERVAL_MIN * 60 * 1000,
    );
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const questionLimit = calculatePoolSize(sanitizeText(combinedContent));

    const activity = await createActivity({
      userId,
      docId,
      date,
      nextMessageAt,
      intervalMinutes,
      status: "active",
      userLevel,
      title: docSectionResult.title ?? "",
      questionLimit,
    });

    if (docSectionResult.content.trim().length > 0) {
      const activityCount = await incrementDailyActivityCount(userId, date);
      const msg = formatDocProcessed(
        false,
        MAX_ACTIVITIES_PER_DAY - activityCount,
        userLevel,
      );
      const summary = currentActivity
        ? await buildPreviousActivitySummary(userId, {
            activityId: currentActivity.id,
            forceRegenerate: true,
          })
        : null;
      await sendAndSaveMessage({
        channel,
        userId,
        activityId: activity.id,
        message: msg,
      });
      if (summary) {
        await waitBeforeSend(
          channel,
          userId,
          DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
        );
        await sendAndSaveMessage({
          channel,
          userId,
          activityId: activity.id,
          message: summary,
        });
      }
      await sendFirstQuestionNow(activity, date, channel);
    } else {
      await updateDoc(docId, userId, {
        status: "failed",
        error: "Nenhuma seção gerada.",
      });
      const msg = formatDocNoQuestions();
      await sendAndSaveMessage({
        channel,
        userId,
        activityId: activity.id,
        message: msg,
        intent: "system_error",
      });
    }
  } catch (err) {
    console.error(`[mergeDoc] unexpected error for doc ${docId}`, err);
    await updateDoc(docId, userId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Erro inesperado.",
    });
    const msg = formatDocProcessingFailed();
    await sendAndSaveMessage({
      channel,
      userId,
      activityId: activeActivity?.id,
      message: msg,
      intent: "system_error",
    });
  }
}
