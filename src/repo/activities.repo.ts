import { Activity, ActivityStatus, Level, Prisma } from "../lib/prisma";
import { prisma } from "../lib/prisma";

type CreateActivityData = {
  userId: string;
  docId: string;
  date: Date;
  userLevel: Level;
  title: string;
  topicIndex?: number;
  nextMessageAt?: Date;
  intervalMinutes?: number;
  status?: ActivityStatus;
  roundCompleted?: boolean;
  questionCount?: number;
  questionLimit?: number;
  sectionCount?: number;
};

type UpdateActivityData = {
  topicIndex?: number;
  nextMessageAt?: Date | null;
  intervalMinutes?: number;
  executionCount?: number;
  waitingUser?: boolean;
  interactionCount?: number;
  lastInteractionAt?: Date | null;
  status?: ActivityStatus;
  statusUpdatedAt?: Date;
  pausedAt?: Date | null;
  completedAt?: Date | null;
  intensiveUntil?: Date | null;
  questionCount?: number;
  sectionCount?: number;
  roundCompleted?: boolean;
  activitySuggestedAt?: Date;
  lastQuestionId?: string | null;
  summary?: string | null;
  lastNudgeStep?: string | null;
  lastNudgeAt?: Date | null;
};

export async function createActivity(
  data: CreateActivityData,
): Promise<Activity> {
  return prisma.activity.create({ data });
}

export async function findActivityById(
  id: string,
  userId: string,
): Promise<Activity | null> {
  return prisma.activity.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

export async function findActivityByDocAndDate(
  userId: string,
  docId: string,
  date: Date,
): Promise<Activity | null> {
  return prisma.activity.findFirst({
    where: { userId, docId, date, deletedAt: null },
  });
}

export async function countAllActivitiesByUser(
  userId: string,
): Promise<number> {
  return await prisma.activity.count({
    where: { userId, deletedAt: null },
  });
}

export async function findLastActivityByUser(
  userId: string,
): Promise<Activity | null> {
  const result = await prisma.activity.findFirst({
    where: { userId, status: "active", deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return result;
}

export async function findRecentGeneratedDocMetadataByUser(
  userId: string,
  limit = 30,
): Promise<Prisma.JsonValue[]> {
  const activities = await prisma.activity.findMany({
    where: { userId, deletedAt: null, doc: { source: "generated" } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { doc: { select: { metadata: true } } },
  });
  return activities.map((a) => a.doc.metadata);
}

export async function findEligibleActivities(limit = 100): Promise<Activity[]> {
  return prisma.activity.findMany({
    where: {
      status: "active",
      deletedAt: null,
      nextMessageAt: { lte: new Date() },
    },
    orderBy: { nextMessageAt: "asc" },
    take: limit,
  });
}

export async function findCurrentActivityByUser(
  userId: string,
): Promise<Activity | null> {
  return prisma.activity.findFirst({
    where: { userId, status: { in: ["active", "paused"] }, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateActivity(
  id: string,
  userId: string,
  data: UpdateActivityData,
): Promise<void> {
  await prisma.activity.updateMany({
    where: { id, userId, deletedAt: null },
    data,
  });
}

export async function updateActivityScore(
  id: string,
  score: number,
): Promise<void> {
  await prisma.activity.updateMany({
    where: { id, deletedAt: null },
    data: { score },
  });
}

export async function softDeleteActivity(
  id: string,
  userId: string,
): Promise<void> {
  await prisma.activity.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

export async function softDeleteActivitiesByDoc(
  docId: string,
  userId: string,
): Promise<void> {
  await prisma.activity.updateMany({
    where: { docId, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

export async function findActivitiesForList(
  userId: string,
): Promise<Activity[]> {
  return prisma.activity.findMany({
    where: {
      userId,
      status: { in: ["active", "paused", "archived"] },
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

const SUMMARY_SELECT = {
  id: true,
  title: true,
  summary: true,
  questionLimit: true,
  questionCount: true,
  score: true,
  statusUpdatedAt: true,
  createdAt: true,
  lastInteractionAt: true,
  questions: {
    where: {
      deletedAt: null,
      status: { in: ["right", "partial", "wrong"] },
    },
    select: { status: true, attemptCount: true },
  },
} satisfies Prisma.ActivitySelect;

export type ActivitySummaryData = Prisma.ActivityGetPayload<{
  select: typeof SUMMARY_SELECT;
}>;

export async function findLatestArchivedActivity(
  userId: string,
): Promise<ActivitySummaryData | null> {
  return prisma.activity.findFirst({
    where: { userId, status: "archived", deletedAt: null },
    orderBy: { statusUpdatedAt: "desc" },
    select: SUMMARY_SELECT,
  });
}

export async function findArchivedActivityBefore(
  userId: string,
  statusUpdatedAt: Date,
  excludeId: string,
): Promise<ActivitySummaryData | null> {
  return prisma.activity.findFirst({
    where: {
      userId,
      status: "archived",
      deletedAt: null,
      id: { not: excludeId },
      statusUpdatedAt: { lt: statusUpdatedAt },
    },
    orderBy: { statusUpdatedAt: "desc" },
    select: SUMMARY_SELECT,
  });
}

export async function findActivityForSummary(
  activityId: string,
  userId?: string,
): Promise<ActivitySummaryData | null> {
  return prisma.activity.findFirst({
    where: userId
      ? { id: activityId, userId, deletedAt: null }
      : { id: activityId },
    select: SUMMARY_SELECT,
  });
}
