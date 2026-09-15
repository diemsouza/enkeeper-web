import { startOfDay } from "date-fns";
import { Notification } from "../lib/prisma";
import { getTodayUsage } from "../repo/daily-usage.repo";
import {
  findDueNotifications,
  markNotificationDeleted,
  markNotificationSent,
} from "../repo/notifications.repo";
import { sendWhatsAppTemplate } from "../vendors/whatsapp.vendor";

type DailyReminderMetadata = {
  currentActivityId?: string;
  templateBodyParams?: string[];
  templateButtonUrlParam?: string;
};

type NotificationCronResult = {
  processed: number;
  sent: number;
  skipped: number;
};

async function processDailyReminderNotification(
  notification: Notification,
): Promise<boolean> {
  const usage = await getTodayUsage(
    notification.userId,
    startOfDay(new Date()),
  );
  if (usage && usage.practiceCount > 0) {
    await markNotificationDeleted(notification.id);
    return false;
  }

  const metadata = notification.metadata as DailyReminderMetadata;
  const externalId = await sendWhatsAppTemplate(
    notification.targetId,
    notification.templateId,
    metadata.templateBodyParams,
    metadata.templateButtonUrlParam,
  );

  await markNotificationSent(notification.id, externalId);
  return true;
}

export async function processDueNotifications(): Promise<NotificationCronResult> {
  const due = await findDueNotifications(100);

  let sent = 0;
  let skipped = 0;

  for (const notification of due) {
    if (notification.targetChannel !== "whatsapp") {
      throw new Error(
        `[processDueNotifications] unsupported targetChannel: ${notification.targetChannel} (notification ${notification.id})`,
      );
    }

    switch (notification.kind) {
      case "daily_reminder": {
        const wasSent = await processDailyReminderNotification(notification);
        if (wasSent) sent++;
        else skipped++;
        break;
      }
      default:
        skipped++;
        break;
    }
  }

  return { processed: due.length, sent, skipped };
}
