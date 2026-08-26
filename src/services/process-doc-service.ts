import { findDocById, updateDoc } from "../repo/docs.repo";
import { formatInvalidContentMessage } from "../core/validate-content";
import {
  createActivity,
  findCurrentActivityByUser,
} from "../repo/activities.repo";
import {
  archiveOrCancelActivity,
  buildPreviousActivitySummary,
} from "./activity-service";
import { generateDocSections } from "../vendors/llm.vendor";
import { findUserById, findUserChannelByUserId } from "../repo/users.repo";
import { MessageChannel } from "../types/message-channel";
import { incrementDailyActivityCount, incrementDailyDocCount } from "../repo/daily-usage.repo";
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
import { sanitizeText, delay } from "../lib/utils";
import { sendAndSaveMessage } from "./message-sender-service";
import { calculatePoolSize } from "../core/pool-size";

export async function processDoc(docId: string, userId: string, channel: MessageChannel): Promise<void> {
  const doc = await findDocById(docId, userId);
  if (!doc || doc.status !== "pending") return;

  try {
    const result = await generateDocSections({
      rawContent: doc.rawContent ?? "",
      docType: doc.docType,
      userId,
      docId,
    });

    if (!result) {
      console.error(`[processDoc] AI failed for doc ${docId}`);
      await updateDoc(docId, userId, { status: "failed" });
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatDocProcessingFailed();
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId,
          userChannelId: userChannel.id,
          message: msg,
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
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId,
          userChannelId: userChannel.id,
          message: msg,
          intent: "system_error",
        });
      }
      return;
    }

    const combinedContent = result.content;

    await updateDoc(docId, userId, {
      title: result.title,
      content: combinedContent,
      level: result.level,
      status: "active",
    });

    const user = await findUserById(userId);
    const activityLevel = user?.level ?? result.level;

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
      userLevel: activityLevel,
      title: result.title ?? "",
      questionLimit,
    });

    if (result.content.trim().length > 0) {
      const activityCount = await incrementDailyActivityCount(userId, date);
      await incrementDailyDocCount(userId, date);
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatDocProcessed(false, MAX_ACTIVITIES_PER_DAY - activityCount);
        const summary = await buildPreviousActivitySummary(userId);
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId,
          userChannelId: userChannel.id,
          message: msg,
        });
        if (summary) {
          await delay(DEFAULT_MESSAGE_INTERVAL_SEC);
          await sendAndSaveMessage({
            channel,
            to: userChannel.channelUserId,
            userId,
            userChannelId: userChannel.id,
            message: { text: summary },
          });
        }
      }
    } else {
      await updateDoc(docId, userId, { status: "failed" });
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatDocNoQuestions();
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId,
          userChannelId: userChannel.id,
          message: msg,
          intent: "system_error",
        });
      }
    }
  } catch (err) {
    console.error(`[processDoc] unexpected error for doc ${docId}`, err);
    await updateDoc(docId, userId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Erro inesperado.",
    });
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg = formatDocProcessingFailed();
      await sendAndSaveMessage({
        channel,
        to: userChannel.channelUserId,
        userId,
        userChannelId: userChannel.id,
        message: msg,
        intent: "system_error",
      });
    }
  }
}
