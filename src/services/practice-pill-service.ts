import { startOfDay } from "date-fns";
import {
  resolvePracticePillState,
  type PracticePillState,
} from "../core/practice-pill";
import { findCurrentActivityByUser } from "../repo/activities.repo";
import { getTodayUsage } from "../repo/daily-usage.repo";

export async function findPracticePillState(
  userId: string,
): Promise<PracticePillState> {
  const [activity, usage] = await Promise.all([
    findCurrentActivityByUser(userId),
    getTodayUsage(userId, startOfDay(new Date())),
  ]);
  return resolvePracticePillState({
    hasActiveActivity: Boolean(activity),
    intensiveUntil: activity?.intensiveUntil ?? null,
    practiceCount: usage?.practiceCount ?? 0,
    intensiveCount: usage?.intensiveCount ?? 0,
  });
}
