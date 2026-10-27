import { Level, PlanCode, PlanStatus, Prisma, User } from "../lib/prisma";
import { prisma } from "../lib/prisma";
import { CheckoutData, UserSignedLinkMetadata } from "../types/domain";
import { getNearestReminderTimeSlot } from "../core/daily-reminder-time";

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByPhone(phone: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { phone } });
}

export async function markUserOnboarded(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
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
  const current = await findUserMetadata(userId);
  const rest = Object.fromEntries(
    Object.entries(current).filter(([key]) => key !== "intent_data"),
  );
  const nextMetadata =
    intent && metadata !== null ? { ...rest, intent_data: metadata } : rest;
  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingIntent: intent,
      pendingIntentAt: intent ? new Date() : null,
      metadata:
        Object.keys(nextMetadata).length > 0
          ? (nextMetadata as Prisma.InputJsonObject)
          : Prisma.DbNull,
    },
  });
}

async function findUserMetadata(userId: string): Promise<Prisma.JsonObject> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { metadata: true },
  });
  const metadata = user?.metadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata
    : {};
}

export async function findUserSignedLink(
  userId: string,
): Promise<UserSignedLinkMetadata | null> {
  const { signedLinkToken, signedLinkExpiresAt } =
    await findUserMetadata(userId);
  if (
    typeof signedLinkToken !== "string" ||
    typeof signedLinkExpiresAt !== "string"
  ) {
    return null;
  }
  return { signedLinkToken, signedLinkExpiresAt };
}

export async function updateUserSignedLink(
  userId: string,
  signedLink: UserSignedLinkMetadata,
): Promise<void> {
  const metadata = await findUserMetadata(userId);
  await prisma.user.update({
    where: { id: userId },
    data: { metadata: { ...metadata, ...signedLink } },
  });
}

export async function markUserPhonePrompted(userId: string): Promise<void> {
  const metadata = await findUserMetadata(userId);
  await prisma.user.update({
    where: { id: userId },
    data: { metadata: { ...metadata, phonePromptedAt: new Date().toISOString() } },
  });
}

export async function updateUserPhone(
  userId: string,
  phone: string,
): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { phone } });
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
  recent: {
    phone: string | null;
    email: string | null;
    name: string | null;
    createdAt: Date;
  }[];
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
      select: { name: true, phone: true, email: true, createdAt: true },
    }),
  ]);
  return { total, active, trial, pro, expired, recent };
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

export type UserIdentity = { phone: string } | { email: string };

type NewUserData = {
  identity: UserIdentity;
  name?: string | null;
  imageUrl?: string | null;
  planExpiresAt: Date;
  source: string | null;
  sourceData: Prisma.InputJsonValue | null;
  timezone?: string;
};

function findUserByIdentity(identity: UserIdentity): Promise<User | null> {
  return prisma.user.findUnique({ where: identity });
}

async function createUser(data: NewUserData): Promise<User> {
  const { identity, name, imageUrl, planExpiresAt, source, sourceData, timezone } =
    data;
  return prisma.user.create({
    data: {
      ...identity,
      name: name ?? undefined,
      imageUrl: imageUrl ?? undefined,
      planCode: "trial",
      planStatus: "active",
      planExpiresAt,
      ...(source ? { source, sourceData: sourceData ?? undefined } : {}),
      ...(timezone
        ? {
            timezone,
            dailyReminderTime: getNearestReminderTimeSlot(new Date(), timezone),
          }
        : {}),
    },
  });
}

export async function findOrCreateUser(
  data: NewUserData,
): Promise<{ user: User; isNew: boolean }> {
  const existing = await findUserByIdentity(data.identity);
  if (existing) return { user: existing, isNew: false };

  try {
    return { user: await createUser(data), isNew: true };
  } catch (err) {
    // Login concorrente com a mesma identidade criou o User entre a busca e o insert.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const created = await findUserByIdentity(data.identity);
      if (created) return { user: created, isNew: false };
    }
    throw err;
  }
}

const DAILY_REMINDER_USER_INCLUDE = {
  activities: {
    where: { status: "active", deletedAt: null },
    orderBy: { statusUpdatedAt: "desc" },
    take: 1,
    select: { lastInteractionAt: true, createdAt: true },
  },
} satisfies Prisma.UserInclude;

export type DailyReminderCandidateUser = Prisma.UserGetPayload<{
  include: typeof DAILY_REMINDER_USER_INCLUDE;
}>;

// "Hoje" é o dia no fuso do usuário: em UTC, um lembrete das 21h BRT cairia no
// dia seguinte e bloquearia (ou liberaria em dobro) o lembrete do outro dia.
async function findUserIdsMatchingCurrentSlot(
  reminderKinds: string[],
  cursorId: string | null,
  limit: number,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT u.id
    FROM users u
    WHERE to_char(
        date_trunc('hour', now() AT TIME ZONE u.timezone)
        + (floor(extract(minute from now() AT TIME ZONE u.timezone) / 30) * 30 || ' minutes')::interval,
        'HH24:MI'
      ) = u.daily_reminder_time
      AND NOT EXISTS (
        SELECT 1
        FROM notifications n
        WHERE n.user_id = u.id
          AND n.kind IN (${Prisma.join(reminderKinds)})
          AND n.deleted_at IS NULL
          AND (n.created_at AT TIME ZONE 'UTC' AT TIME ZONE u.timezone)::date
            = (now() AT TIME ZONE u.timezone)::date
      )
      ${cursorId ? Prisma.sql`AND u.id > ${cursorId}` : Prisma.empty}
    ORDER BY u.id ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}

export async function findUsersForDailyReminder(
  reminderKinds: string[],
  cursorId: string | null,
  limit = 500,
): Promise<{
  users: DailyReminderCandidateUser[];
  lastRawId: string | null;
  rawBatchSize: number;
}> {
  const candidateIds = await findUserIdsMatchingCurrentSlot(
    reminderKinds,
    cursorId,
    limit,
  );
  if (candidateIds.length === 0) {
    return { users: [], lastRawId: null, rawBatchSize: 0 };
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: candidateIds },
      status: "active",
      planStatus: "active",
      planExpiresAt: { gt: new Date() },
      activities: { some: { status: "active", deletedAt: null } },
      phone: { not: null },
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
