import {
  findActivitiesByDoc,
  findLatestArchivedActivityForSummary,
  updateActivity,
} from "../repo/activities.repo";
import { formatPreviousActivitySummary } from "../core/formatters";

export async function archiveOrCancelActivitiesByDoc(
  docId: string,
  userId: string,
): Promise<void> {
  const activities = await findActivitiesByDoc(docId, userId);
  for (const activity of activities) {
    if (activity.status !== "active" && activity.status !== "paused") continue;
    const status = activity.interactionCount > 0 ? "archived" : "cancelled";
    await updateActivity(activity.id, userId, { status });
  }
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
    const revisadas = data.questions.filter((q) => q.attemptCount > 1).length;
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
      questionCount: data.questions.length,
      right,
      partial,
      wrong,
      responses,
      revisadas,
      period,
    });

    await updateActivity(data.id, userId, { summary: text });
    return text;
  } catch {
    return null;
  }
}
