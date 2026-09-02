import { Doc, Level } from "../lib/prisma";
import {
  parseDomainInput,
  parseTopicSelectionInput,
  parseFocusSelectionInput,
  FocusSelectionInput,
  NumericSelectionError,
} from "../core/parser";
import {
  formatDomainQuestion,
  formatTopicQuestion,
  formatTopicError,
  formatFocusQuestion,
  formatFocusError,
  formatFocusTooMany,
  formatSelectionOutOfRange,
  formatSelectionMixedFormat,
  formatSelectionSingleOnly,
  formatFocusNumericTooMany,
  formatNewActivityFlowCanceled,
  formatDocProcessed,
} from "../core/formatters";
import { isValidFocusKey, findFocusLabel } from "../core/focus";
import { pickSubtopic } from "../core/subtopic-picker";
import { pickTopicSuggestions } from "../core/topic-picker";
import {
  DomainId,
  MAX_ACTIVITIES_PER_DAY,
  FIRST_MESSAGE_INTERVAL_MIN,
  NEXT_MESSAGE_INTERVAL_MIN,
  TOPIC_SUGGESTIONS,
  getDomainLabel,
  DEFAULT_MESSAGE_INTERVAL_SEC,
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
  findRecentGeneratedDocMetadataByUser,
} from "../repo/activities.repo";
import {
  archiveOrCancelActivity,
  buildPreviousActivitySummary,
} from "./activity-service";
import {
  findUserChannelByUserId,
  updateUserPendingIntent,
} from "../repo/users.repo";
import {
  incrementDailyActivityCount,
  incrementDailyDocCount,
} from "../repo/daily-usage.repo";
import { calculatePoolSize } from "../core/pool-size";
import { sanitizeText, delay } from "../lib/utils";
import { MessageChannel } from "../types/message-channel";
import { FocusSuggestion, GeneratedDocMetadata } from "../types/domain";
import { FormattedMessage } from "../types/out-message";
import { sendAndSaveMessage } from "./message-sender-service";

export type DomainCaptureResult =
  | {
      outcome: "captured";
      domain: DomainId;
      topics: string[];
      message: FormattedMessage;
    }
  | { outcome: "canceled"; message: FormattedMessage }
  | { outcome: "invalid"; message: FormattedMessage };

function selectionErrorMessage(
  reason: NumericSelectionError,
  maxSelections: number,
): FormattedMessage {
  if (reason === "mixed_format") return formatSelectionMixedFormat();
  if (reason === "out_of_range") return formatSelectionOutOfRange();
  return maxSelections === 1
    ? formatSelectionSingleOnly()
    : formatFocusNumericTooMany();
}

export function processDomainResponse(text: string): DomainCaptureResult {
  const parsed = parseDomainInput(text);
  if (parsed.type === "cancel") {
    return { outcome: "canceled", message: formatNewActivityFlowCanceled() };
  }
  if (parsed.type === "error") {
    return {
      outcome: "invalid",
      message: selectionErrorMessage(parsed.reason, 1),
    };
  }
  if (parsed.type === "invalid") {
    return { outcome: "invalid", message: formatDomainQuestion() };
  }
  const topics = pickTopicSuggestions(TOPIC_SUGGESTIONS[parsed.id]);
  return {
    outcome: "captured",
    domain: parsed.id,
    topics,
    message: formatTopicQuestion(topics),
  };
}

export type TopicCaptureResult =
  | {
      outcome: "captured";
      topic: string;
      focusSuggestions: FocusSuggestion[];
      subtopics: string[];
      message: FormattedMessage;
    }
  | { outcome: "retry"; message: FormattedMessage }
  | { outcome: "invalid"; message: FormattedMessage };

export async function processTopicResponse(
  text: string,
  userId: string,
  level: Level,
  domain: string,
  topics: string[],
): Promise<TopicCaptureResult> {
  const parsed = parseTopicSelectionInput(text, topics);
  if (parsed.type === "cancel" || parsed.type === "invalid") {
    return { outcome: "invalid", message: formatTopicQuestion(topics) };
  }
  if (parsed.type === "error") {
    return {
      outcome: "invalid",
      message: selectionErrorMessage(parsed.reason, 1),
    };
  }
  const resolvedTopic = parsed.type === "known" ? parsed.topic : parsed.text;

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
    subtopics: validated.subtopics,
    message: formatFocusQuestion(focusSuggestions),
  };
}

export type FocusCaptureResult =
  | { outcome: "invalid"; message: FormattedMessage }
  | { outcome: "retry"; message: FormattedMessage }
  | { outcome: "done" };

export async function processFocusResponse(
  text: string,
  focusSuggestions: FocusSuggestion[],
  subtopics: string[],
  userId: string,
  level: Level,
  domain: string,
  topic: string,
  channel: MessageChannel,
): Promise<FocusCaptureResult> {
  const parsed = parseFocusSelectionInput(text, focusSuggestions);
  if (parsed.type === "cancel" || parsed.type === "invalid") {
    return {
      outcome: "invalid",
      message: formatFocusQuestion(focusSuggestions),
    };
  }
  if (parsed.type === "error") {
    return { outcome: "retry", message: selectionErrorMessage(parsed.reason, 2) };
  }
  const focusSelection: FocusSelectionInput = parsed;

  const subtopicValue = await resolveSubtopic(userId, domain, topic, subtopics);

  const generated = await generateFocusContent({
    level,
    domain: getDomainLabel(domain),
    topic,
    subtopic: subtopicValue,
    focusSelection,
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
  const focusKeys = data.focusKeys
    ? data.focusKeys.filter((key) => isValidFocusKey(key))
    : [];
  if (focusKeys.length === 0) {
    return { outcome: "retry", message: formatFocusError() };
  }

  const doc = await createGeneratedDoc({
    userId,
    domainKey: domain,
    topic,
    subtopics,
    subtopic: subtopicValue,
    focusKeys,
    data,
  });

  const currentActivity = await findCurrentActivityByUser(userId);
  if (currentActivity) {
    await archiveOrCancelActivity(currentActivity, userId);
  }

  await updateUserPendingIntent(userId, null);

  if (data.content.trim().length === 0) {
    await updateDoc(doc.id, userId, { status: "failed" });
    return { outcome: "retry", message: formatFocusError() };
  }

  const date = await createActivityForDoc(userId, doc.id, level, data);

  await sendActivityCreatedConfirmation(
    userId,
    date,
    channel,
    doc.metadata as GeneratedDocMetadata | null,
    currentActivity?.id ?? null,
  );

  return { outcome: "done" };
}

async function resolveSubtopic(
  userId: string,
  domainKey: string,
  topic: string,
  subtopics: string[],
): Promise<string> {
  const recentMetadata = await findRecentGeneratedDocMetadataByUser(userId);
  const lastMatch = recentMetadata.find((metadata) => {
    const m = metadata as GeneratedDocMetadata | null;
    return m?.domainKey === domainKey && m?.topic === topic;
  }) as GeneratedDocMetadata | undefined;

  return pickSubtopic(subtopics, lastMatch?.subtopic ?? null);
}

async function createGeneratedDoc(params: {
  userId: string;
  domainKey: string;
  topic: string;
  subtopics: string[];
  subtopic: string;
  focusKeys: string[];
  data: FocusContentResult;
}): Promise<Doc> {
  const { userId, domainKey, topic, subtopics, subtopic, focusKeys, data } =
    params;
  const metadata: GeneratedDocMetadata = {
    domainKey,
    domain: getDomainLabel(domainKey),
    topic,
    subtopics,
    subtopic,
    focusKeys,
    focus: focusKeys.map((key) => findFocusLabel(key) ?? key),
  };
  return createDoc({
    userId,
    docType: "text",
    title: data.title,
    content: data.content,
    level: data.level,
    status: "active",
    source: "generated",
    metadata,
  });
}

async function createActivityForDoc(
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

  const questionLimit = calculatePoolSize(sanitizeText(data.content));

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

  return date;
}

async function sendActivityCreatedConfirmation(
  userId: string,
  date: Date,
  channel: MessageChannel,
  metadata: GeneratedDocMetadata | null,
  previousActivityId: string | null,
): Promise<void> {
  const activityCount = await incrementDailyActivityCount(userId, date);
  await incrementDailyDocCount(userId, date);

  const userChannel = await findUserChannelByUserId(userId);
  if (!userChannel) return;

  const msg = formatDocProcessed(
    false,
    MAX_ACTIVITIES_PER_DAY - activityCount,
    metadata,
  );
  const summary = previousActivityId
    ? await buildPreviousActivitySummary(userId, {
        activityId: previousActivityId,
      })
    : null;
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
      message: summary,
      mediaType: summary.imagePath ? "image" : undefined,
      mediaId: summary.imagePath,
    });
  }
}
