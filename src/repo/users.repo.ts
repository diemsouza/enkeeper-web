import {
  ChannelType,
  Level,
  PlanCode,
  PlanStatus,
  Prisma,
  User,
  UserChannel,
} from "../lib/prisma";
import { prisma } from "../lib/prisma";

type UserWithChannels = User & { channels: UserChannel[] };

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByChannel(
  channelType: ChannelType,
  channelId: string,
): Promise<UserWithChannels | null> {
  const channel = await prisma.userChannel.findFirst({
    where: { channelType, channelId },
    include: { user: { include: { channels: true } } },
  });
  return channel?.user ?? null;
}

export async function markUserOnboarded(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
  });
}

export async function updateUserName(
  userId: string,
  name: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { name },
  });
}

export async function updateUserPlanStatus(
  userId: string,
  planStatus: PlanStatus,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { planStatus },
  });
}

export async function findUserChannelByUserId(
  userId: string,
  channelType: ChannelType = "whatsapp",
): Promise<UserChannel | null> {
  return prisma.userChannel.findFirst({
    where: { userId, channelType },
  });
}

export async function updateUserLevel(
  userId: string,
  level: Level,
): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { level } });
}

const NEW_ACTIVITY_FLOW_INTENTS = [
  "waiting_set_level",
  "waiting_set_activity_domain",
  "waiting_set_activity_topic",
  "waiting_set_activity_focus",
];

export async function findUsersWithExpiredFlowIntent(
  threshold: Date,
): Promise<User[]> {
  return prisma.user.findMany({
    where: {
      pendingIntent: { in: NEW_ACTIVITY_FLOW_INTENTS },
      pendingIntentAt: { lt: threshold },
    },
  });
}

export async function updateUserPendingIntent(
  userId: string,
  intent: string | null,
  metadata: Prisma.InputJsonValue | null = null,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingIntent: intent,
      pendingIntentAt: intent ? new Date() : null,
      metadata:
        intent && metadata !== null
          ? { intent_data: metadata }
          : Prisma.JsonNull,
    },
  });
}

export async function updateUserPlan(
  userId: string,
  data: {
    planCode?: PlanCode;
    planStatus?: PlanStatus;
    planExpiresAt?: Date | null;
  },
): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data });
}

type UserStat = {
  total: number;
  active: number;
  trial: number;
  pro: number;
  expired: number;
  recent: { channelId: string; name: string | null; createdAt: Date }[];
};

export async function fetchUserStats(): Promise<UserStat> {
  const now = new Date();
  const [total, active, trial, pro, expired, recent] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { planStatus: "active" } }),
    prisma.user.count({
      where: {
        planCode: "trial",
        planStatus: "active",
        planExpiresAt: { gt: now },
      },
    }),
    prisma.user.count({ where: { planCode: "pro", planStatus: "active" } }),
    prisma.user.count({ where: { planStatus: "expired" } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        name: true,
        createdAt: true,
        channels: {
          select: { channelId: true },
          where: { channelType: "whatsapp" },
          take: 1,
        },
      },
    }),
  ]);
  return {
    total,
    active,
    trial,
    pro,
    expired,
    recent: recent.map((u) => ({
      channelId: u.channels[0]?.channelId ?? "?",
      name: u.name,
      createdAt: u.createdAt,
    })),
  };
}

export async function updateUserLastRequest(
  userId: string,
  messageId: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastRequestAt: new Date(),
      lastMessageId: messageId,
      lastResponseAt: null,
    },
  });
}

export async function updateUserLastResponse(
  userId: string,
  messageId: string,
): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, lastMessageId: messageId },
    data: { lastResponseAt: new Date() },
  });
}

export async function createUserWithChannel(
  channelType: ChannelType,
  channelId: string,
  channelCode?: string,
  planExpiresAt?: Date,
): Promise<UserWithChannels> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { planCode: "trial", planStatus: "active", planExpiresAt },
    });
    await tx.userChannel.create({
      data: { userId: user.id, channelType, channelId, channelCode },
    });
    return tx.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { channels: true },
    });
  });
}
