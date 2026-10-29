import { startOfDay } from "date-fns";
import { Activity, Doc, DocType, Level, User } from "../lib/prisma";
import {
  ActivityRequestControls,
  ResolvedActivityRequest,
  isActivityCreationInProgress,
  isUnchangedSuggestion,
  resolveActivityRequest,
} from "../core/activity-request";
import { canPractice } from "../core/access";
import { canStartActivity } from "../core/limits";
import { findFocusLabel } from "../core/focus";
import { pickSubtopic } from "../core/subtopic-picker";
import { calculatePoolSize } from "../core/pool-size";
import { validateContent } from "../core/validate-content";
import {
  formatActivityCreationFailed,
  formatDocProcessed,
  formatDocReceiving,
} from "../core/formatters";
import {
  DEFAULT_MESSAGE_INTERVAL_SEC,
  DOC_PENDING_TIMEOUT_MS,
  FIRST_MESSAGE_INTERVAL_MIN,
  MAX_ACTIVITIES_PER_DAY,
  NEXT_MESSAGE_INTERVAL_MIN,
  getDomainLabel,
} from "../lib/constants";
import { sanitizeText } from "../lib/utils";
import { FocusContentResult } from "../lib/llm-schemas";
import {
  generateActivityRequest,
  generateFocusContent,
  generateTopicValidation,
} from "../vendors/llm.vendor";
import { createDoc, findPendingDocByUser } from "../repo/docs.repo";
import { createDocItem } from "../repo/doc-items.repo";
import { saveMessage } from "../repo/messages.repo";
import { findUserMediaTranscription } from "../repo/media.repo";
import {
  createActivity,
  findCurrentActivityByUser,
  findRecentGeneratedDocMetadataByUser,
} from "../repo/activities.repo";
import {
  clearUserActivityCreating,
  findUserActivityCreation,
  markUserActivityCreating,
  updateUserLevel,
} from "../repo/users.repo";
import {
  getTodayActivityCount,
  incrementDailyActivityCount,
  incrementDailyDocCount,
  incrementUserMessageCount,
} from "../repo/daily-usage.repo";
import {
  archiveOrCancelActivity,
  buildPreviousActivitySummary,
} from "./activity-service";
import { sendAndSaveMessage, waitBeforeSend } from "./message-sender-service";
import { sendFirstQuestionNow } from "./activity-cron.service";
import { mergeDoc } from "./merge-doc-service";
import { MaterialMediaType } from "./material-extract-service";
import { MessageChannel } from "../types/message-channel";
import { GeneratedDocMetadata } from "../types/domain";

export type ActivityCreationBlock =
  | { status: "plan_expired" }
  | { status: "daily_limit" }
  | { status: "already_creating" };

export type TextActivityRequestOutcome =
  | ActivityCreationBlock
  | { status: "blocked" }
  | { status: "needs_more"; hint: string | null; examples: string[] }
  | { status: "created"; request: ResolvedActivityRequest };

export type MaterialItemInput = {
  messageId: string;
  mediaType: MaterialMediaType;
  fileName: string;
  sizeBytes: number;
  text?: string;
  mediaId?: string;
};

export type MaterialActivityOutcome =
  | ActivityCreationBlock
  | { status: "insufficient_content" }
  | { status: "invalid_item" }
  | { status: "created"; docId: string; latestDocItemId: string };

type ResolvedMaterialItem = MaterialItemInput & { text: string };

export async function checkCanCreateActivity(
  user: Pick<User, "id" | "planStatus" | "planExpiresAt">,
): Promise<ActivityCreationBlock | null> {
  if (!canPractice(user)) return { status: "plan_expired" };
  const activityCount = await getTodayActivityCount(
    user.id,
    startOfDay(new Date()),
  );
  if (!canStartActivity(activityCount)) return { status: "daily_limit" };
  const now = new Date();
  const { activityCreatingAt } = await findUserActivityCreation(user.id);
  const pendingDoc = await findPendingDocByUser(user.id);
  const isMaterialProcessing =
    pendingDoc !== null &&
    now.getTime() - pendingDoc.createdAt.getTime() < DOC_PENDING_TIMEOUT_MS;
  if (isActivityCreationInProgress(activityCreatingAt, now) || isMaterialProcessing) {
    return { status: "already_creating" };
  }
  return null;
}

export async function prepareTextActivity(
  user: Pick<User, "id" | "planStatus" | "planExpiresAt">,
  controls: ActivityRequestControls,
): Promise<TextActivityRequestOutcome> {
  const block = await checkCanCreateActivity(user);
  if (block) return block;

  // Sugestao pronta e nao editada ja carrega objetivo e assunto.
  const extraction = isUnchangedSuggestion(controls.text, controls.domainKey)
    ? null
    : await generateActivityRequest({
        text: controls.text.trim(),
        level: controls.level,
        domainHint: getDomainLabel(controls.domainKey),
        userId: user.id,
      });

  if (extraction && !extraction.isAllowed) return { status: "blocked" };
  if (extraction && !extraction.isSufficient) {
    return {
      status: "needs_more",
      hint: extraction.missingHint,
      examples: extraction.examples.slice(0, 3),
    };
  }

  const request = resolveActivityRequest(controls, extraction);
  await updateUserLevel(user.id, controls.level);
  await markUserActivityCreating(user.id, request);
  return { status: "created", request };
}

export async function prepareActivityRetry(
  user: Pick<User, "id" | "planStatus" | "planExpiresAt">,
): Promise<
  ActivityCreationBlock | { status: "created"; request: ResolvedActivityRequest } | null
> {
  const block = await checkCanCreateActivity(user);
  if (block) return block;
  const { lastActivityRequest } = await findUserActivityCreation(user.id);
  if (!lastActivityRequest) return null;
  await markUserActivityCreating(user.id, lastActivityRequest);
  return { status: "created", request: lastActivityRequest };
}

export async function createTextActivity(
  userId: string,
  request: ResolvedActivityRequest,
  channel: MessageChannel,
): Promise<void> {
  try {
    const created = await generateAndCreateActivity(userId, request, channel);
    if (!created) await sendActivityCreationFailed(userId, channel);
  } catch (err) {
    console.error(`[createTextActivity] user ${userId}`, err);
    await sendActivityCreationFailed(userId, channel);
  } finally {
    await clearUserActivityCreating(userId);
  }
}

async function generateAndCreateActivity(
  userId: string,
  request: ResolvedActivityRequest,
  channel: MessageChannel,
): Promise<boolean> {
  const { domainKey, topic, level, focusKeys } = request;
  const domain = getDomainLabel(domainKey);

  await channel.notifyTyping(userId);
  const validated = await generateTopicValidation({ level, domain, topic, userId });
  if (validated.status === "error" || validated.subtopics.length === 0) {
    return false;
  }
  const subtopics = validated.subtopics;
  const subtopic = await resolveSubtopic(userId, domainKey, topic, subtopics);

  await channel.notifyTyping(userId);
  const generated = await generateFocusContent({
    level,
    domain,
    topic,
    subtopic,
    focusKeys,
    userId,
  });
  if (generated.status === "error") return false;
  const data = generated.data;
  if (data.content.trim().length === 0) return false;

  const doc = await createGeneratedDoc({ userId, request, subtopics, subtopic, data });
  await startActivityForDoc(userId, doc, level, data, channel);
  return true;
}

async function startActivityForDoc(
  userId: string,
  doc: Doc,
  level: Level,
  data: FocusContentResult,
  channel: MessageChannel,
): Promise<void> {
  const currentActivity = await findCurrentActivityByUser(userId);
  if (currentActivity) {
    await archiveOrCancelActivity(currentActivity, userId);
  }
  const activity = await createActivityForDoc(userId, doc.id, level, data);
  await sendActivityCreatedConfirmation({
    userId,
    activity,
    level,
    channel,
    metadata: doc.metadata as GeneratedDocMetadata | null,
    previousActivityId: currentActivity?.id ?? null,
  });
  await sendFirstQuestionNow(activity, activity.date, channel);
}

async function sendActivityCreationFailed(
  userId: string,
  channel: MessageChannel,
): Promise<void> {
  const activity = await findCurrentActivityByUser(userId);
  await sendAndSaveMessage({
    channel,
    userId,
    activityId: activity?.id,
    message: formatActivityCreationFailed(),
    intent: "system_error",
  });
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
  request: ResolvedActivityRequest;
  subtopics: string[];
  subtopic: string;
  data: FocusContentResult;
}): Promise<Doc> {
  const { userId, request, subtopics, subtopic, data } = params;
  const metadata: GeneratedDocMetadata = {
    domainKey: request.domainKey,
    domain: getDomainLabel(request.domainKey),
    topic: request.topic,
    subtopics,
    subtopic,
    focusKeys: request.focusKeys,
    focus: request.focusKeys.map((key) => findFocusLabel(key) ?? key),
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
): Promise<Activity> {
  const now = new Date();
  const nextMessageAt = new Date(
    now.getTime() + FIRST_MESSAGE_INTERVAL_MIN * 60 * 1000,
  );
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const questionLimit = calculatePoolSize(sanitizeText(data.content));

  return createActivity({
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
}

async function sendActivityCreatedConfirmation(params: {
  userId: string;
  activity: Activity;
  level: Level;
  channel: MessageChannel;
  metadata: GeneratedDocMetadata | null;
  previousActivityId: string | null;
}): Promise<void> {
  const { userId, activity, level, channel, metadata, previousActivityId } =
    params;
  const activityCount = await incrementDailyActivityCount(userId, activity.date);
  await incrementDailyDocCount(userId, activity.date);

  const msg = formatDocProcessed(
    false,
    MAX_ACTIVITIES_PER_DAY - activityCount,
    level,
    metadata,
  );
  const summary = previousActivityId
    ? await buildPreviousActivitySummary(userId, {
        activityId: previousActivityId,
        forceRegenerate: true,
      })
    : null;
  await sendAndSaveMessage({ channel, userId, activityId: activity.id, message: msg });
  if (summary) {
    await waitBeforeSend(channel, userId, DEFAULT_MESSAGE_INTERVAL_SEC * 1000);
    await sendAndSaveMessage({
      channel,
      userId,
      activityId: activity.id,
      message: summary,
    });
  }
}

export async function prepareMaterialActivity(
  user: Pick<User, "id" | "planStatus" | "planExpiresAt">,
  level: Level,
  items: MaterialItemInput[],
): Promise<MaterialActivityOutcome> {
  const block = await checkCanCreateActivity(user);
  if (block) return block;

  const resolved = await resolveMaterialItems(user.id, items);
  if (!resolved) return { status: "invalid_item" };
  const joined = resolved.map((item) => item.text).join("\n\n");
  if (!validateContent(joined).isValid) {
    return { status: "insufficient_content" };
  }

  await updateUserLevel(user.id, level);
  const { docId, latestDocItemId } = await createPendingMaterialDoc(
    user.id,
    resolved,
  );
  return { status: "created", docId, latestDocItemId };
}

export async function startMaterialActivity(
  userId: string,
  docId: string,
  latestDocItemId: string,
  channel: MessageChannel,
): Promise<void> {
  const activity = await findCurrentActivityByUser(userId);
  await sendAndSaveMessage({
    channel,
    userId,
    activityId: activity?.id,
    message: formatDocReceiving(),
  });
  await mergeDoc(docId, userId, latestDocItemId, channel);
}

// Imagem: o texto vem da transcricao gravada na extracao, nunca do cliente.
async function resolveMaterialItems(
  userId: string,
  items: MaterialItemInput[],
): Promise<ResolvedMaterialItem[] | null> {
  const resolved: ResolvedMaterialItem[] = [];
  for (const item of items) {
    if (item.mediaType !== "image") {
      if (!item.text?.trim()) return null;
      resolved.push({ ...item, text: item.text, mediaId: undefined });
      continue;
    }
    const media = item.mediaId
      ? await findUserMediaTranscription(item.mediaId, userId)
      : null;
    if (!media?.mediaTranscription || media.parentId !== item.messageId) {
      return null;
    }
    resolved.push({ ...item, text: media.mediaTranscription });
  }
  return resolved;
}

async function createPendingMaterialDoc(
  userId: string,
  items: ResolvedMaterialItem[],
): Promise<{ docId: string; latestDocItemId: string }> {
  const types = Array.from(new Set(items.map((item) => item.mediaType)));
  const docType: DocType = types.length === 1 ? types[0] : "mixed";
  const doc = await createDoc({ userId, docType, status: "pending" });
  const activity = await findCurrentActivityByUser(userId);
  const today = startOfDay(new Date());

  let latestDocItemId = "";
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    await saveMessage({
      id: item.messageId,
      userId,
      activityId: activity?.id,
      role: "user",
      content: item.text,
      intent: "free_text",
      mediaType: item.mediaType,
      metadata: { file_name: item.fileName, size_bytes: item.sizeBytes },
      receivedAt: new Date(),
    });
    await incrementUserMessageCount(userId, today);
    const docItem = await createDocItem({
      docId: doc.id,
      userId,
      messageId: item.messageId,
      docType: item.mediaType,
      rawContent: item.text,
      order: index + 1,
    });
    latestDocItemId = docItem.id;
  }
  return { docId: doc.id, latestDocItemId };
}
