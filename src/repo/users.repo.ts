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
import { CheckoutData } from "../types/domain";
import { getNearestReminderTimeSlot } from "../core/daily-reminder-time";

type UserWithChannels = User & { channels: UserChannel[] };

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByIdentifier(
  channelType: ChannelType,
  identifier: string,
): Promise<User | null> {
  const byPhone = await prisma.userChannel.findFirst({
    where: { channelType, channelUserPhone: identifier },
    include: { user: true },
  });
  if (byPhone) return byPhone.user;

  const byUsername = await prisma.userChannel.findFirst({
    where: { channelType, channelUsername: identifier },
    include: { user: true },
  });
  if (byUsername) return byUsername.user;

  const byChannelUserId = await prisma.userChannel.findFirst({
    where: { channelType, channelUserId: identifier },
    include: { user: true },
  });
  return byChannelUserId?.user ?? null;
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
    data: { planStatus, planStatusUpdatedAt: new Date() },
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

export async function findUserChannelByPhone(
  phone: string,
  filter: { channelType: ChannelType } | { channelTypeNot: ChannelType },
): Promise<{ user: UserWithChannels; userChannel: UserChannel } | null> {
  const where =
    "channelType" in filter
      ? { channelUserPhone: phone, channelType: filter.channelType }
      : { channelUserPhone: phone, channelType: { not: filter.channelTypeNot } };
  const row = await prisma.userChannel.findFirst({
    where,
    include: { user: { include: { channels: true } } },
  });
  if (!row) return null;
  const { user, ...userChannel } = row;
  return { user, userChannel };
}

export async function upsertWebUserChannel(
  userId: string,
  phone: string,
): Promise<UserChannel> {
  return prisma.userChannel.upsert({
    where: { userId_channelType: { userId, channelType: "web" } },
    update: {},
    create: {
      userId,
      channelType: "web",
      channelUserId: phone,
      channelUserPhone: phone,
    },
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
  cursorId: string | null,
  threshold: Date,
  limit = 500,
): Promise<User[]> {
  return prisma.user.findMany({
    where: {
      pendingIntent: { in: NEW_ACTIVITY_FLOW_INTENTS },
      pendingIntentAt: { lt: threshold },
      ...(cursorId ? { id: { gt: cursorId } } : {}),
      activities: {
        some: { status: { in: ["active", "paused"] }, deletedAt: null },
      },
    },
    orderBy: { id: "asc" },
    take: limit,
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
        intent && metadata !== null ? { intent_data: metadata } : Prisma.DbNull,
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
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      ...(data.planCode !== undefined ? { planCodeUpdatedAt: new Date() } : {}),
      ...(data.planStatus !== undefined
        ? { planStatusUpdatedAt: new Date() }
        : {}),
    },
  });
}

export async function updateUserCheckoutData(
  userId: string,
  checkoutData: CheckoutData | null,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { checkoutData: checkoutData ?? Prisma.DbNull },
  });
}

type UserStat = {
  total: number;
  active: number;
  trial: number;
  pro: number;
  expired: number;
  recent: { channelIdentity: string; name: string | null; createdAt: Date }[];
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
          select: {
            channelUserId: true,
            channelUsername: true,
            channelUserPhone: true,
          },
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
      channelIdentity:
        u.channels[0]?.channelUserPhone ||
        u.channels[0]?.channelUsername ||
        u.channels[0]?.channelUserId ||
        "?",
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

type UserChannelResolution = {
  user: UserWithChannels;
  userChannel: UserChannel;
  isNew: boolean;
};

async function attemptFindOrCreateUserChannel(
  channelType: ChannelType,
  channelUserId: string,
  channelUserPhone: string | undefined,
  channelUsername: string | undefined,
  planExpiresAt: Date | undefined,
  source: string | null | undefined,
  sourceData: Prisma.InputJsonValue | null | undefined,
  timezone: string | undefined,
): Promise<UserChannelResolution | null> {
  try {
    return await prisma.$transaction(async (tx) => {
      const byBsuid = await tx.userChannel.findFirst({
        where: { channelType, channelUserId },
        include: { user: { include: { channels: true } } },
      });
      if (byBsuid) {
        const { user, ...userChannel } = byBsuid;
        return { user, userChannel, isNew: false };
      }

      if (channelUserPhone) {
        const byPhone = await tx.userChannel.findFirst({
          where: { channelType, channelUserPhone },
          include: { user: { include: { channels: true } } },
        });
        if (byPhone) {
          const { user, ...rest } = byPhone;
          const userChannel = await tx.userChannel.update({
            where: { id: rest.id },
            data: {
              channelUserId,
              ...(channelUsername ? { channelUsername } : {}),
            },
          });
          return { user, userChannel, isNew: false };
        }
      }

      const user = await tx.user.create({
        data: {
          planCode: "trial",
          planStatus: "active",
          planExpiresAt,
          ...(source ? { source, sourceData: sourceData ?? undefined } : {}),
          ...(timezone
            ? {
                timezone,
                dailyReminderTime: getNearestReminderTimeSlot(
                  new Date(),
                  timezone,
                ),
              }
            : {}),
        },
      });
      const userChannel = await tx.userChannel.create({
        data: {
          userId: user.id,
          channelType,
          channelUserId,
          channelUserPhone,
          channelUsername,
        },
      });
      return {
        user: { ...user, channels: [userChannel] },
        userChannel,
        isNew: true,
      };
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return null;
    }
    throw err;
  }
}

export async function findOrCreateUserChannel(
  channelType: ChannelType,
  channelUserId: string,
  channelUserPhone?: string,
  channelUsername?: string,
  planExpiresAt?: Date,
  source?: string | null,
  sourceData?: Prisma.InputJsonValue | null,
  timezone?: string,
): Promise<UserChannelResolution> {
  const first = await attemptFindOrCreateUserChannel(
    channelType,
    channelUserId,
    channelUserPhone,
    channelUsername,
    planExpiresAt,
    source,
    sourceData,
    timezone,
  );
  if (first) return first;

  // A concurrent request (webhook redelivery) resolved the same channelUserId
  // between our lookup and write; re-read instead of failing the message.
  const retry = await attemptFindOrCreateUserChannel(
    channelType,
    channelUserId,
    channelUserPhone,
    channelUsername,
    planExpiresAt,
    source,
    sourceData,
    timezone,
  );
  if (retry) return retry;

  throw new Error(
    `[findOrCreateUserChannel] failed to resolve UserChannel after retry (channelUserId=${channelUserId})`,
  );
}

const DAILY_REMINDER_USER_INCLUDE = {
  channels: {
    where: { channelType: "web", channelUserPhone: { not: null } },
    take: 1,
  },
} satisfies Prisma.UserInclude;

export type DailyReminderCandidateUser = Prisma.UserGetPayload<{
  include: typeof DAILY_REMINDER_USER_INCLUDE;
}>;

async function findUserIdsMatchingCurrentSlot(
  cursorId: string | null,
  limit: number,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT u.id
    FROM users u
    WHERE u.daily_reminder_enabled = true
      AND to_char(now() AT TIME ZONE u.timezone, 'HH24:MI') = u.daily_reminder_time
      ${cursorId ? Prisma.sql`AND u.id > ${cursorId}` : Prisma.empty}
    ORDER BY u.id ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}

export async function findUsersForDailyReminder(
  todayStart: Date,
  todayEnd: Date,
  cursorId: string | null,
  limit = 500,
): Promise<{
  users: DailyReminderCandidateUser[];
  lastRawId: string | null;
  rawBatchSize: number;
}> {
  const candidateIds = await findUserIdsMatchingCurrentSlot(cursorId, limit);
  if (candidateIds.length === 0) {
    return { users: [], lastRawId: null, rawBatchSize: 0 };
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: candidateIds },
      status: "active",
      planStatus: "active",
      planExpiresAt: { gt: new Date() },
      notifications: {
        none: {
          kind: "daily_reminder",
          deletedAt: null,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      },
      channels: {
        some: { channelType: "web", channelUserPhone: { not: null } },
      },
    },
    include: DAILY_REMINDER_USER_INCLUDE,
  });

  return {
    users,
    lastRawId: candidateIds[candidateIds.length - 1],
    rawBatchSize: candidateIds.length,
  };
}

export async function updateUserDailyReminder(
  userId: string,
  data: { enabled: boolean; time: string; timezone: string },
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      dailyReminderEnabled: data.enabled,
      dailyReminderTime: data.time,
      timezone: data.timezone,
    },
  });
}
