import { DailyUsage } from "../lib/prisma";
import { prisma } from "../lib/prisma";

export async function getTodayUsage(
  userId: string,
  date: Date,
): Promise<DailyUsage | null> {
  return prisma.dailyUsage.findFirst({ where: { userId, date } });
}

export async function incrementDailyItemCount(
  userId: string,
  date: Date,
): Promise<number> {
  const result = await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { docCount: { increment: 1 } },
    create: { userId, date, docCount: 1 },
  });
  return result.docCount;
}

export async function incrementDailyActivityCount(
  userId: string,
  date: Date,
): Promise<number> {
  const result = await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { activityCount: { increment: 1 } },
    create: { userId, date, activityCount: 1 },
  });
  return result.activityCount;
}

export async function getTodayActivityCount(
  userId: string,
  date: Date,
): Promise<number> {
  const usage = await prisma.dailyUsage.findFirst({ where: { userId, date } });
  return usage?.activityCount ?? 0;
}

export async function incrementUserMessageCount(
  userId: string,
  date: Date,
): Promise<void> {
  await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: {
      userMessageCount: { increment: 1 },
      messagesCount: { increment: 1 },
    },
    create: { userId, date, userMessageCount: 1, messagesCount: 1 },
  });
}

export async function incrementAgentMessageCount(
  userId: string,
  date: Date,
): Promise<void> {
  await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: {
      agentMessageCount: { increment: 1 },
      messagesCount: { increment: 1 },
    },
    create: { userId, date, agentMessageCount: 1, messagesCount: 1 },
  });
}
