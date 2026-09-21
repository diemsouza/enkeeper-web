import { endOfDay, startOfDay } from "date-fns";
import {
  DailyReminderCandidateUser,
  findUsersForDailyReminder,
} from "../repo/users.repo";
import { countSm2EligibleQuestionsByUser } from "../repo/questions.repo";
import { createNotification, markNotificationSent } from "../repo/notifications.repo";
import { buildWaLoginUrl } from "./wa-login-link-service";
import {
  formatDailyReminderMessage,
  DAILY_REMINDER_TEMPLATE_NAME,
} from "../core/formatters";
import { sendWhatsAppTemplate } from "../vendors/whatsapp.vendor";

const DAILY_REMINDER_KIND = "daily_reminder";
const DAILY_REMINDER_BATCH_LIMIT = 500;

type DailyReminderResult = {
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
};

async function trySendReminder(
  user: DailyReminderCandidateUser,
  now: Date,
): Promise<"sent" | "skipped"> {
  const userChannel = user.channels[0];
  if (!userChannel?.channelUserPhone) return "skipped";

  const eligibleCount = await countSm2EligibleQuestionsByUser(user.id);
  if (eligibleCount === 0) return "skipped";

  const link = await buildWaLoginUrl(userChannel.channelUserPhone, "/login");
  const message = formatDailyReminderMessage(eligibleCount, link);

  const externalId = await sendWhatsAppTemplate(
    userChannel.channelUserPhone,
    DAILY_REMINDER_TEMPLATE_NAME,
    message.templateBodyParams,
  );

  const notification = await createNotification({
    userId: user.id,
    targetChannel: "whatsapp",
    targetId: userChannel.channelUserPhone,
    kind: DAILY_REMINDER_KIND,
    message: message.text,
    templateId: DAILY_REMINDER_TEMPLATE_NAME,
    metadata: { templateBodyParams: message.templateBodyParams },
    nextAt: now,
  });
  await markNotificationSent(notification.id, externalId);

  return "sent";
}

export async function decideDailyReminders(): Promise<DailyReminderResult> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let errors = 0;
  let cursorId: string | null = null;

  for (;;) {
    const { users, lastRawId, rawBatchSize } = await findUsersForDailyReminder(
      todayStart,
      todayEnd,
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
