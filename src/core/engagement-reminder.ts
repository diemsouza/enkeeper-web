export type EngagementReminder =
  | "daily_reminder_revision"
  | "daily_reminder_v2"
  | "nudge_days";

export const ENGAGEMENT_REMINDERS: EngagementReminder[] = [
  "daily_reminder_revision",
  "daily_reminder_v2",
  "nudge_days",
];

const DAY_MS = 24 * 60 * 60 * 1000;
const LAST_DAILY_REMINDER_DAY = 6;
const NUDGE_DAYS = [7, 14];

export function daysSince(last: Date, now: Date): number {
  return Math.floor((now.getTime() - last.getTime()) / DAY_MS);
}

export function isDailyReminderWindow(daysInactive: number): boolean {
  return daysInactive >= 0 && daysInactive <= LAST_DAILY_REMINDER_DAY;
}

// Dias 7 e 14 disparam independente do toggle de lembrete; depois do 14 nada
// automático até o usuário praticar de novo (Product-Rules §12).
export function pickEngagementReminder(params: {
  daysInactive: number;
  isReminderEnabled: boolean;
  eligibleCount: number;
}): EngagementReminder | null {
  const { daysInactive, isReminderEnabled, eligibleCount } = params;
  if (NUDGE_DAYS.includes(daysInactive)) return "nudge_days";
  if (!isReminderEnabled || !isDailyReminderWindow(daysInactive)) return null;
  return eligibleCount > 0 ? "daily_reminder_revision" : "daily_reminder_v2";
}
