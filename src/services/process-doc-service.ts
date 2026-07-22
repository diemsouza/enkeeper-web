import { findDocById, updateDoc } from "../repo/docs.repo";
import { formatInvalidContentMessage } from "../core/validate-content";
import {
  createActivity,
  findCurrentActivityByUser,
  updateActivity,
} from "../repo/activities.repo";
import { createSection } from "../repo/sections.repo";
import {
  archiveOrCancelActivity,
  buildPreviousActivitySummary,
} from "./activity-service";
import { generateDocSections } from "../vendors/llm.vendor";
import { findUserById, findUserChannelByUserId } from "../repo/users.repo";
import { saveMessage } from "../repo/messages.repo";
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
} from "../lib/constants";
import { sanitizeText } from "../lib/utils";
import { calculatePoolSize } from "../core/pool-size";
import { SectionType } from "../lib/prisma";

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
        await channel.sendMessage(userChannel.channelId, msg);
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
        await channel.sendMessage(userChannel.channelId, msg);
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

    const questionLimit = result.sections.reduce(
      (sum, s) =>
        sum +
        calculatePoolSize({
          sectionType: s.sectionType as SectionType,
          content: sanitizeText(s.content),
        }),
      0,
    );

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

    for (const sectionData of [...result.sections].sort(
      (a, b) => a.order - b.order,
    )) {
      await createSection({
        userId,
        docId,
        activityId: activity.id,
        sectionType: sectionData.sectionType,
        title: sanitizeText(sectionData.title),
        content: sanitizeText(sectionData.content),
        order: sectionData.order,
      });
    }

    if (result.sections.length > 0) {
      await updateActivity(activity.id, userId, {
        sectionCount: result.sections.length,
      });
      const activityCount = await incrementDailyActivityCount(userId, date);
      await incrementDailyDocCount(userId, date);
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatDocProcessed(false, MAX_ACTIVITIES_PER_DAY - activityCount);
        const summary = await buildPreviousActivitySummary(userId);
        const messages = summary ? [msg, summary] : [msg];
        await channel.sendMessage(userChannel.channelId, messages);
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
        await channel.sendMessage(userChannel.channelId, msg);
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
    console.error(`[processDoc] unexpected error for doc ${docId}`, err);
    await updateDoc(docId, userId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Erro inesperado.",
    });
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg = formatDocProcessingFailed();
      await channel.sendMessage(userChannel.channelId, msg);
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
