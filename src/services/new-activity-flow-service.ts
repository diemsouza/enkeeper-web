import { Level, SectionType } from "../lib/prisma";
import {
  parseContentGroupInput,
  parseContentSubgroupInput,
} from "../core/parser";
import {
  formatContentGroupQuestion,
  formatContentSubgroupQuestion,
  formatContentTopicQuestion,
  formatContentTopicError,
  formatNewActivityFlowCanceled,
  formatDocProcessed,
} from "../core/formatters";
import {
  ContentGroupId,
  ContentSubgroupId,
  MAX_ACTIVITIES_PER_DAY,
  FIRST_MESSAGE_INTERVAL_MIN,
  NEXT_MESSAGE_INTERVAL_MIN,
  getContentGroupLabel,
  getContentSubgroupLabel,
} from "../lib/constants";
import { generateTopicContent } from "../vendors/llm.vendor";
import { createDoc, updateDoc } from "../repo/docs.repo";
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
import { findUserChannelByUserId, updateUserPendingIntent } from "../repo/users.repo";
import { saveMessage } from "../repo/messages.repo";
import {
  incrementDailyActivityCount,
  incrementDailyDocCount,
} from "../repo/daily-usage.repo";
import { calculatePoolSize } from "../core/pool-size";
import { sanitizeText } from "../lib/utils";
import { MessageChannel } from "../types/message-channel";

export type GroupCaptureResult =
  | { outcome: "captured"; contentGroup: ContentGroupId; message: string }
  | { outcome: "canceled"; message: string }
  | { outcome: "invalid"; message: string };

export function processGroupResponse(text: string): GroupCaptureResult {
  const parsed = parseContentGroupInput(text);
  if (parsed === "cancel") {
    return { outcome: "canceled", message: formatNewActivityFlowCanceled() };
  }
  if (parsed === null) {
    return { outcome: "invalid", message: formatContentGroupQuestion() };
  }
  return {
    outcome: "captured",
    contentGroup: parsed,
    message: formatContentSubgroupQuestion(),
  };
}

export type SubgroupCaptureResult =
  | { outcome: "captured"; contentSubgroup: ContentSubgroupId; message: string }
  | { outcome: "canceled"; message: string }
  | { outcome: "invalid"; message: string };

export function processSubgroupResponse(
  text: string,
  contentGroup: string,
): SubgroupCaptureResult {
  const parsed = parseContentSubgroupInput(text);
  if (parsed === "cancel") {
    return { outcome: "canceled", message: formatNewActivityFlowCanceled() };
  }
  if (parsed === null) {
    return { outcome: "invalid", message: formatContentSubgroupQuestion() };
  }
  return {
    outcome: "captured",
    contentSubgroup: parsed,
    message: formatContentTopicQuestion(contentGroup),
  };
}

export type TopicCaptureResult =
  | { outcome: "invalid"; message: string }
  | { outcome: "retry"; message: string }
  | { outcome: "done" };

export async function processTopicResponse(
  contentTopic: string,
  userId: string,
  level: Level,
  contentGroup: string,
  contentSubgroup: string,
  channel: MessageChannel,
): Promise<TopicCaptureResult> {
  const trimmedTopic = contentTopic.trim();
  if (trimmedTopic.length === 0) {
    return {
      outcome: "invalid",
      message: formatContentTopicQuestion(contentGroup),
    };
  }

  const generated = await generateTopicContent({
    level,
    contentGroup: getContentGroupLabel(contentGroup),
    contentSubgroup: getContentSubgroupLabel(contentSubgroup),
    contentTopic: trimmedTopic,
    userId,
  });

  if (generated.status === "error") {
    return { outcome: "retry", message: formatContentTopicError() };
  }

  const data = generated.data;
  const combinedContent = data.sections.map((s) => s.content).join("\n\n");

  const doc = await createDoc({
    userId,
    docType: "text",
    title: data.title,
    content: combinedContent,
    level: data.level,
    status: "active",
    source: "generated",
    metadata: { contentGroup, contentSubgroup, contentTopic: trimmedTopic },
  });

  const currentActivity = await findCurrentActivityByUser(userId);
  if (currentActivity) {
    await archiveOrCancelActivity(currentActivity, userId);
  }

  await updateUserPendingIntent(userId, null);

  if (data.sections.length === 0) {
    await updateDoc(doc.id, userId, { status: "failed" });
    return { outcome: "retry", message: formatContentTopicError() };
  }

  const now = new Date();
  const nextMessageAt = new Date(
    now.getTime() + FIRST_MESSAGE_INTERVAL_MIN * 60 * 1000,
  );
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const questionLimit = data.sections.reduce(
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
    docId: doc.id,
    date,
    nextMessageAt,
    intervalMinutes: NEXT_MESSAGE_INTERVAL_MIN,
    status: "active",
    userLevel: level,
    title: data.title ?? "",
    questionLimit,
  });

  for (const sectionData of [...data.sections].sort(
    (a, b) => a.order - b.order,
  )) {
    await createSection({
      userId,
      docId: doc.id,
      activityId: activity.id,
      sectionType: sectionData.sectionType,
      title: sanitizeText(sectionData.title),
      content: sanitizeText(sectionData.content),
      order: sectionData.order,
    });
  }

  await updateActivity(activity.id, userId, {
    sectionCount: data.sections.length,
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

  return { outcome: "done" };
}
