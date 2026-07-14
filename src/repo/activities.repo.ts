import { Activity, Doc, ActivityStatus, Level } from "../lib/prisma";
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
  pausedAt?: Date | null;
  completedAt?: Date | null;
  intensiveUntil?: Date | null;
  questionCount?: number;
  sectionCount?: number;
  roundCompleted?: boolean;
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

export async function findActivitiesByDoc(
  docId: string,
  userId: string,
): Promise<Activity[]> {
  return prisma.activity.findMany({
    where: { docId, userId, deletedAt: null },
    orderBy: { date: "desc" },
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

export async function pauseActivitiesByDoc(
  docId: string,
  userId: string,
): Promise<void> {
  await prisma.activity.updateMany({
    where: { docId, userId, status: "active", deletedAt: null },
    data: { status: "paused", pausedAt: new Date(), intensiveUntil: null },
  });
}

export async function resumeActivitiesByDoc(
  docId: string,
  userId: string,
): Promise<void> {
  await prisma.activity.updateMany({
    where: { docId, userId, status: "paused", deletedAt: null },
    data: { status: "active", pausedAt: null },
  });
}

export type ActivityWithDoc = Activity & {
  doc: Pick<Doc, "id" | "status">;
};

export async function findActivitiesForList(
  userId: string,
): Promise<ActivityWithDoc[]> {
  return prisma.activity.findMany({
    where: {
      userId,
      status: { in: ["active", "paused", "archived"] },
      deletedAt: null,
    },
    include: { doc: { select: { id: true, status: true } } },
    orderBy: { createdAt: "desc" },
  }) as Promise<ActivityWithDoc[]>;
}

export async function findLatestArchivedActivityForSummary(userId: string) {
  return prisma.activity.findFirst({
    where: { userId, status: "archived", summary: null, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      questionLimit: true,
      createdAt: true,
      lastInteractionAt: true,
      questions: {
        where: {
          deletedAt: null,
          status: { in: ["right", "partial", "wrong"] },
        },
        select: { status: true, attemptCount: true },
      },
    },
  });
}

export async function findActivityForSummary(activityId: string) {
  return prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      title: true,
      questionLimit: true,
      createdAt: true,
      lastInteractionAt: true,
      questions: {
        where: {
          deletedAt: null,
          status: { in: ["right", "partial", "wrong"] },
        },
        select: { status: true, attemptCount: true },
      },
    },
  });
}
