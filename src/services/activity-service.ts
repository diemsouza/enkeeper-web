import { findActivitiesByDoc, updateActivity } from "../repo/activities.repo";

export async function archiveOrCancelActivitiesByDoc(docId: string, userId: string): Promise<void> {
  const activities = await findActivitiesByDoc(docId, userId);
  for (const activity of activities) {
    if (activity.status !== "active" && activity.status !== "paused") continue;
    const status = activity.interactionCount > 0 ? "archived" : "cancelled";
    await updateActivity(activity.id, userId, { status });
  }
}
