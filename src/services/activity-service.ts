import { Activity } from "../lib/prisma";
import {
  findActivityForSummary,
  findCurrentActivityByUser,
  findLatestArchivedActivityForSummary,
  updateActivity,
} from "../repo/activities.repo";
import { findQuestionRevisionStatsByActivity } from "../repo/questions.repo";
import {
  formatActivitySuggestion,
  formatActivitySuggestionInteractive,
  formatPreviousActivitySummary,
  formatRoundCompletedFallback,
  formatRoundCompletedSummary,
} from "../core/formatters";
import {
  ACTIVITY_SUGGESTION_ACCURACY_THRESHOLD,
  ACTIVITY_SUGGESTION_COVERAGE_THRESHOLD,
  AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC,
} from "../lib/constants";
import { delay } from "../lib/utils";
import { MessageChannel } from "../types/message-channel";
import { sendAndSaveMessage } from "./message-sender-service";

export async function archiveOrCancelActivity(
  activity: Activity,
  userId: string,
): Promise<void> {
  if (activity.status !== "active" && activity.status !== "paused") return;
  const status = activity.interactionCount > 0 ? "archived" : "cancelled";
  await updateActivity(activity.id, userId, {
    status,
    statusUpdatedAt: new Date(),
    intensiveUntil: null,
  });
}

export async function switchToActivity(
  userId: string,
  target: Activity,
): Promise<void> {
  const current = await findCurrentActivityByUser(userId);
  if (current && current.id !== target.id) {
    await archiveOrCancelActivity(current, userId);
  }
  await updateActivity(target.id, userId, {
    status: "active",
    statusUpdatedAt: new Date(),
    pausedAt: null,
    intensiveUntil: null,
  });
}

export async function buildPreviousActivitySummary(
  userId: string,
): Promise<string | null> {
  try {
    const data = await findLatestArchivedActivityForSummary(userId);
    if (!data) return null;
    if (data.questions.length === 0) return null;

    const right = data.questions.filter((q) => q.status === "right").length;
    const partial = data.questions.filter((q) => q.status === "partial").length;
    const wrong = data.questions.filter((q) => q.status === "wrong").length;
    const responses = right + partial + wrong;
    const reviews = data.questions.filter((q) => q.attemptCount > 1).length;
    if (responses === 0) return null;

    const ref = data.lastInteractionAt ?? data.createdAt;
    const diffHours = Math.floor(
      (ref.getTime() - data.createdAt.getTime()) / (1000 * 60 * 60),
    );
    const days = Math.floor(diffHours / 24);
    const period =
      diffHours >= 24
        ? `${days} dia${days > 1 ? "s" : ""}`
        : diffHours >= 1
          ? `${diffHours} hora${diffHours > 1 ? "s" : ""}`
          : `alguns minutos`;

    const text = formatPreviousActivitySummary({
      activityTitle: data.title ?? "Sem título",
      questionCount: data.questionLimit,
      right,
      partial,
      wrong,
      responses,
      reviews,
      period,
    });

    await updateActivity(data.id, userId, { summary: text });
    return text;
  } catch {
    return null;
  }
}

export async function buildRoundCompletedSummary(
  activityId: string,
): Promise<string> {
  try {
    const data = await findActivityForSummary(activityId);
    if (!data) return formatRoundCompletedFallback();
    if (data.questions.length === 0) return formatRoundCompletedFallback();

    const right = data.questions.filter((q) => q.status === "right").length;
    const partial = data.questions.filter((q) => q.status === "partial").length;
    const wrong = data.questions.filter((q) => q.status === "wrong").length;
    const responses = right + partial + wrong;
    if (responses === 0) return formatRoundCompletedFallback();

    return formatRoundCompletedSummary({
      questionCount: data.questionLimit,
      right,
      responses,
    });
  } catch {
    return formatRoundCompletedFallback();
  }
}

export async function isActivitySuggestionEligible(
  activityId: string,
): Promise<boolean> {
  const questions = await findQuestionRevisionStatsByActivity(activityId);

  if (questions.length === 0) {
    console.log(
      `[isActivitySuggestionEligible] activityId=${activityId} questions=0 eligible=false reason=no_questions`,
    );
    return false;
  }

  const reviewed = questions.filter((q) => q.revisionCount >= 1);
  const coverageRatio = reviewed.length / questions.length;

  const rightCount = reviewed.filter((q) => q.status === "right").length;
  const accuracyRatio = reviewed.length > 0 ? rightCount / reviewed.length : 0;

  const coveragePass = coverageRatio >= ACTIVITY_SUGGESTION_COVERAGE_THRESHOLD;
  const accuracyPass = accuracyRatio >= ACTIVITY_SUGGESTION_ACCURACY_THRESHOLD;
  const eligible = coveragePass && accuracyPass;

  const reason = !coveragePass
    ? "coverage_below_threshold"
    : !accuracyPass
      ? "accuracy_below_threshold"
      : "eligible";

  console.log(
    `[isActivitySuggestionEligible] activityId=${activityId} ` +
      `questions=${questions.length} reviewed=${reviewed.length} ` +
      `coverageRatio=${coverageRatio.toFixed(2)}/${ACTIVITY_SUGGESTION_COVERAGE_THRESHOLD} ` +
      `accuracyRatio=${accuracyRatio.toFixed(2)}/${ACTIVITY_SUGGESTION_ACCURACY_THRESHOLD} ` +
      `eligible=${eligible} reason=${reason}`,
  );

  return eligible;
}

type MaybeSendActivitySuggestionParams = {
  activity: Activity;
  userId: string;
  userChannelId: string;
  isIntensiveMode: boolean;
  isLastAnswerCorrect: boolean;
  channel: MessageChannel;
  to: string;
  today: Date;
};

export async function maybeSendActivitySuggestion(
  params: MaybeSendActivitySuggestionParams,
): Promise<void> {
  const {
    activity,
    userId,
    userChannelId,
    isIntensiveMode,
    isLastAnswerCorrect,
    channel,
    to,
    today,
  } = params;
  if (isIntensiveMode) return;
  if (!isLastAnswerCorrect) return;
  if (!activity.roundCompleted) return;
  if (activity.activitySuggestedAt !== null) return;

  const eligible = await isActivitySuggestionEligible(activity.id);
  if (!eligible) return;

  await delay(AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC);
  const content = formatActivitySuggestion();
  const contentInteractive = formatActivitySuggestionInteractive();
  await sendAndSaveMessage({
    channel,
    to,
    userId,
    userChannelId,
    activityId: activity.id,
    content,
    part: {
      content: contentInteractive,
      buttons: [{ id: "new_activity_suggestion", title: "Nova atividade" }],
    },
    intent: "activity_suggestion",
    today,
  });

  await updateActivity(activity.id, userId, {
    activitySuggestedAt: new Date(),
  });
}
