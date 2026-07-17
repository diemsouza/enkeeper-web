import { Activity } from "../lib/prisma";
import {
  findActivityForSummary,
  findCurrentActivityByUser,
  findLatestArchivedActivityForSummary,
  updateActivity,
} from "../repo/activities.repo";
import {
  formatPreviousActivitySummary,
  formatRoundCompletedFallback,
  formatRoundCompletedSummary,
} from "../core/formatters";

export async function archiveOrCancelActivity(
  activity: Activity,
  userId: string,
): Promise<void> {
  if (activity.status !== "active" && activity.status !== "paused") return;
  const status = activity.interactionCount > 0 ? "archived" : "cancelled";
  await updateActivity(activity.id, userId, { status, intensiveUntil: null });
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
