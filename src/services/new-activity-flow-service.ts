import { Doc, Level, SectionType } from "../lib/prisma";
import {
  parseDomainInput,
  parseTopicSelectionInput,
  parseFocusSelectionInput,
  FocusSelectionInput,
} from "../core/parser";
import {
  formatDomainQuestion,
  formatTopicQuestion,
  formatTopicError,
  formatFocusQuestion,
  formatFocusError,
  formatFocusTooMany,
  formatNewActivityFlowCanceled,
  formatDocProcessed,
} from "../core/formatters";
import { isValidFocusKey } from "../core/focus";
import {
  DomainId,
  MAX_ACTIVITIES_PER_DAY,
  FIRST_MESSAGE_INTERVAL_MIN,
  NEXT_MESSAGE_INTERVAL_MIN,
  TOPIC_SUGGESTIONS,
  getDomainLabel,
} from "../lib/constants";
import {
  generateTopicValidation,
  generateFocusContent,
} from "../vendors/llm.vendor";
import { FocusContentResult } from "../lib/llm-schemas";
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
import {
  findUserChannelByUserId,
  updateUserPendingIntent,
} from "../repo/users.repo";
import { saveMessage } from "../repo/messages.repo";
import {
  incrementDailyActivityCount,
  incrementDailyDocCount,
} from "../repo/daily-usage.repo";
import { calculatePoolSize } from "../core/pool-size";
import { sanitizeText } from "../lib/utils";
import { MessageChannel } from "../types/message-channel";
import { FocusSuggestion } from "../types/domain";

export type DomainCaptureResult =
  | { outcome: "captured"; domain: DomainId; message: string }
  | { outcome: "canceled"; message: string }
  | { outcome: "invalid"; message: string };

export function processDomainResponse(text: string): DomainCaptureResult {
  const parsed = parseDomainInput(text);
  if (parsed === "cancel") {
    return { outcome: "canceled", message: formatNewActivityFlowCanceled() };
  }
  if (parsed === null) {
    return { outcome: "invalid", message: formatDomainQuestion() };
  }
  return {
    outcome: "captured",
    domain: parsed,
    message: formatTopicQuestion(parsed),
  };
}

export type TopicCaptureResult =
  | {
      outcome: "captured";
      topic: string;
      focusSuggestions: FocusSuggestion[];
      message: string;
    }
  | { outcome: "retry"; message: string }
  | { outcome: "invalid"; message: string };

export async function processTopicResponse(
  text: string,
  userId: string,
  level: Level,
  domain: string,
): Promise<TopicCaptureResult> {
  const suggestions = TOPIC_SUGGESTIONS[domain as DomainId] ?? [];
  const resolvedTopic = parseTopicSelectionInput(text, suggestions);
  if (resolvedTopic === null || resolvedTopic === "cancel") {
    return { outcome: "invalid", message: formatTopicQuestion(domain) };
  }

  const validated = await generateTopicValidation({
    level,
    domain: getDomainLabel(domain),
    topic: resolvedTopic,
    userId,
  });

  if (validated.status === "error") {
    return { outcome: "retry", message: formatTopicError() };
  }

  const focusSuggestions = validated.focusSuggestions.filter((s) =>
    isValidFocusKey(s.key),
  );
  if (focusSuggestions.length === 0) {
    return { outcome: "retry", message: formatTopicError() };
  }

  return {
    outcome: "captured",
    topic: resolvedTopic,
    focusSuggestions,
    message: formatFocusQuestion(focusSuggestions),
  };
}

export type FocusCaptureResult =
  | { outcome: "invalid"; message: string }
  | { outcome: "retry"; message: string }
  | { outcome: "done" };

export async function processFocusResponse(
  text: string,
  focusSuggestions: FocusSuggestion[],
  userId: string,
  level: Level,
  domain: string,
  topic: string,
  channel: MessageChannel,
): Promise<FocusCaptureResult> {
  const parsed = parseFocusSelectionInput(text, focusSuggestions);
  if (parsed === null || parsed === "cancel") {
    return {
      outcome: "invalid",
      message: formatFocusQuestion(focusSuggestions),
    };
  }

  const generated = await generateFocusContent({
    level,
    domain: getDomainLabel(domain),
    topic,
    focusSelection: parsed,
    userId,
  });

  if (generated.status === "error") {
    const message =
      generated.kind === "too_many_focus"
        ? formatFocusTooMany()
        : formatFocusError();
    return { outcome: "retry", message };
  }

  const data = generated.data;
  const focusKeys = data.focusKeys.filter((key) => isValidFocusKey(key));
  if (focusKeys.length === 0) {
    return { outcome: "retry", message: formatFocusError() };
  }

  const doc = await createGeneratedDoc(userId, domain, topic, focusKeys, data);

  const currentActivity = await findCurrentActivityByUser(userId);
  if (currentActivity) {
    await archiveOrCancelActivity(currentActivity, userId);
  }

  await updateUserPendingIntent(userId, null);

  if (data.sections.length === 0) {
    await updateDoc(doc.id, userId, { status: "failed" });
    return { outcome: "retry", message: formatFocusError() };
  }

  const date = await createActivityWithSections(userId, doc.id, level, data);

  await sendActivityCreatedConfirmation(userId, date, channel);

  return { outcome: "done" };
}

async function createGeneratedDoc(
  userId: string,
  domain: string,
  topic: string,
  focus: string[],
  data: FocusContentResult,
): Promise<Doc> {
  const combinedContent = data.sections.map((s) => s.content).join("\n\n");
  return createDoc({
    userId,
    docType: "text",
    title: data.title,
    content: combinedContent,
    level: data.level,
    status: "active",
    source: "generated",
    metadata: { domain, topic, focus },
  });
}

async function createActivityWithSections(
  userId: string,
  docId: string,
  level: Level,
  data: FocusContentResult,
): Promise<Date> {
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
    docId,
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
      docId,
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

  return date;
}

async function sendActivityCreatedConfirmation(
  userId: string,
  date: Date,
  channel: MessageChannel,
): Promise<void> {
  const activityCount = await incrementDailyActivityCount(userId, date);
  await incrementDailyDocCount(userId, date);

  const userChannel = await findUserChannelByUserId(userId);
  if (!userChannel) return;

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
