import { Notification, Prisma } from "../lib/prisma";
import { prisma } from "../lib/prisma";

type CreateNotificationData = {
  userId: string;
  targetChannel: string;
  targetId: string;
  kind: string;
  message: string;
  templateId: string;
  metadata?: Record<string, unknown>;
  nextAt: Date;
};

export async function createNotification(
  data: CreateNotificationData,
): Promise<Notification> {
  return prisma.notification.create({
    data: {
      ...data,
      metadata: data.metadata as Prisma.InputJsonObject | undefined,
    },
  });
}

export async function findTodayNotification(
  userId: string,
  kind: string,
  start: Date,
  end: Date,
): Promise<Notification | null> {
  return prisma.notification.findFirst({
    where: {
      userId,
      kind,
      deletedAt: null,
      createdAt: { gte: start, lte: end },
    },
  });
}

export async function countSentNotificationsSince(
  userId: string,
  kind: string,
  since: Date,
): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      kind,
      sentAt: { not: null },
      createdAt: { gte: since },
    },
  });
}

export async function markNotificationSent(
  id: string,
  externalId: string | null,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, sentAt: null },
    data: { sentAt: new Date(), externalId },
  });
}

export async function markNotificationReadByExternalId(
  externalId: string,
  readAt: Date,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { externalId, readAt: null },
    data: { readAt },
  });
}
