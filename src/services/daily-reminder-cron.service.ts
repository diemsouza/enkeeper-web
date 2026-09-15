import { addDays, endOfDay, startOfDay } from "date-fns";
import {
  findActiveActivitiesForReminder,
  ReminderCandidateActivity,
} from "../repo/activities.repo";
import { countSm2EligibleQuestions } from "../repo/questions.repo";
import {
  countSentNotificationsSince,
  createNotification,
} from "../repo/notifications.repo";
import { signWaLoginToken } from "../core/wa-login-token";
import {
  formatDailyReminderMessage,
  DAILY_REMINDER_TEMPLATE_NAME,
} from "../core/formatters";

const REMINDER_INTERVALS_DAYS = [1, 2, 3, 7, 14];
const REMINDER_BATCH_LIMIT = 500;
const DAILY_REMINDER_KIND = "daily_reminder";

type DailyReminderResult = {
  processed: number;
  created: number;
  skipped: number;
};

async function tryCreateReminder(
  activity: ReminderCandidateActivity,
  now: Date,
): Promise<boolean> {
  const userChannel = activity.user.channels[0];
  if (!userChannel?.channelUserPhone) return false;

  const eligibleCount = await countSm2EligibleQuestions(activity.id);
  if (eligibleCount === 0) return false;

  const lastPracticeAt = activity.lastInteractionAt ?? activity.createdAt;
  const stepsSent = await countSentNotificationsSince(
    activity.userId,
    DAILY_REMINDER_KIND,
    lastPracticeAt,
  );
  if (stepsSent >= REMINDER_INTERVALS_DAYS.length) return false;

  const threshold = addDays(lastPracticeAt, REMINDER_INTERVALS_DAYS[stepsSent]);
  if (now < threshold) return false;

  const token = await signWaLoginToken(userChannel.channelUserPhone);
  const message = formatDailyReminderMessage(eligibleCount, token);

  await createNotification({
    userId: activity.userId,
    targetChannel: "whatsapp",
    targetId: userChannel.channelUserPhone,
    kind: DAILY_REMINDER_KIND,
    message: message.text,
    templateId: DAILY_REMINDER_TEMPLATE_NAME,
    metadata: {
      currentActivityId: activity.id,
      templateBodyParams: message.templateBodyParams,
      templateButtonUrlParam: message.templateButtonUrlParam,
    },
    nextAt: now,
  });

  return true;
}

export async function decideDailyReminders(): Promise<DailyReminderResult> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  let processed = 0;
  let created = 0;
  let skipped = 0;
  let cursorId: string | null = null;

  for (;;) {
    const batch = await findActiveActivitiesForReminder(
      cursorId,
      todayStart,
      todayEnd,
      REMINDER_BATCH_LIMIT,
    );
    if (batch.length === 0) break;

    for (const activity of batch) {
      processed++;
      const wasCreated = await tryCreateReminder(activity, now);
      if (wasCreated) created++;
      else skipped++;
    }

    cursorId = batch[batch.length - 1].id;
    if (batch.length < REMINDER_BATCH_LIMIT) break;
  }

  return { processed, created, skipped };
}
