import { findActivitiesForTtl, updateActivity } from "../repo/activities.repo";

type TtlResult = {
  completed: number;
  abandoned: number;
  errors: number;
};

export async function processActivityTtl(): Promise<TtlResult> {
  const activities = await findActivitiesForTtl();

  let completed = 0;
  let abandoned = 0;
  let errors = 0;

  for (const activity of activities) {
    try {
      if (activity.interactionCount > 0) {
        await updateActivity(activity.id, activity.userId, {
          status: "completed",
          completedAt: new Date(),
          nextMessageAt: null,
        });
        completed++;
      } else {
        await updateActivity(activity.id, activity.userId, {
          status: "abandoned",
          nextMessageAt: null,
        });
        abandoned++;
      }
    } catch (err) {
      console.error(`[activity-ttl] activity ${activity.id} error:`, err);
      errors++;
    }
  }

  return { completed, abandoned, errors };
}
