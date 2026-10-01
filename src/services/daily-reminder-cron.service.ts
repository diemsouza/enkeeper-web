import {
  DailyReminderCandidateUser,
  findUsersForDailyReminder,
} from "../repo/users.repo";
import { countSm2EligibleQuestionsByUser } from "../repo/questions.repo";
import {
  createNotification,
  markNotificationSent,
} from "../repo/notifications.repo";
import { formatEngagementReminder } from "../core/formatters";
import {
  daysSince,
  EngagementReminder,
  ENGAGEMENT_REMINDERS,
  isDailyReminderWindow,
  pickEngagementReminder,
} from "../core/engagement-reminder";
import { sendWhatsAppTemplate } from "../vendors/whatsapp.vendor";

const DAILY_REMINDER_BATCH_LIMIT = 500;

type DailyReminderResult = {
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
};

async function countEligibleIfNeeded(
  user: DailyReminderCandidateUser,
  daysInactive: number,
): Promise<number> {
  if (!user.dailyReminderEnabled || !isDailyReminderWindow(daysInactive)) {
    return 0;
  }
  return countSm2EligibleQuestionsByUser(user.id);
}

async function trySendReminder(
  user: DailyReminderCandidateUser,
  now: Date,
): Promise<"sent" | "skipped"> {
  const userChannel = user.channels[0];
  const activity = user.activities[0];
  if (!userChannel?.channelUserPhone || !activity) return "skipped";

  const daysInactive = daysSince(
    activity.lastInteractionAt ?? activity.createdAt,
    now,
  );
  const eligibleCount = await countEligibleIfNeeded(user, daysInactive);
  const reminder = pickEngagementReminder({
    daysInactive,
    isReminderEnabled: user.dailyReminderEnabled,
    eligibleCount,
  });
  if (!reminder) return "skipped";

  await sendReminder(
    user.id,
    userChannel.channelUserPhone,
    reminder,
    { eligibleCount, daysInactive },
    now,
  );
  return "sent";
}

async function sendReminder(
  userId: string,
  phone: string,
  reminder: EngagementReminder,
  params: { eligibleCount: number; daysInactive: number },
  now: Date,
): Promise<void> {
  const message = formatEngagementReminder(reminder, params);
  const externalId = await sendWhatsAppTemplate(
    phone,
    reminder,
    message.templateBodyParams,
  );

  const notification = await createNotification({
    userId,
    targetChannel: "whatsapp",
    targetId: phone,
    kind: reminder,
    message: message.text,
    templateId: reminder,
    metadata: { templateBodyParams: message.templateBodyParams },
    nextAt: now,
  });
  await markNotificationSent(notification.id, externalId);
}

export async function decideDailyReminders(): Promise<DailyReminderResult> {
  const now = new Date();

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;
  let cursorId: string | null = null;

  for (;;) {
    const { users, lastRawId, rawBatchSize } = await findUsersForDailyReminder(
      ENGAGEMENT_REMINDERS,
      cursorId,
      DAILY_REMINDER_BATCH_LIMIT,
    );
    if (rawBatchSize === 0) break;

    for (const user of users) {
      processed++;
      try {
        const outcome = await trySendReminder(user, now);
        if (outcome === "sent") sent++;
        else skipped++;
      } catch (err) {
        console.error(`[decideDailyReminders] user ${user.id}:`, err);
        errors++;
      }
    }

    cursorId = lastRawId;
    if (rawBatchSize < DAILY_REMINDER_BATCH_LIMIT) break;
  }

  return { processed, sent, skipped, errors };
}
