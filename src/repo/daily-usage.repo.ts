import { DailyUsage } from '@prisma/client'
import { prisma } from '../lib/prisma'

export async function getTodayUsage(userId: string, date: Date): Promise<DailyUsage | null> {
  return prisma.dailyUsage.findFirst({ where: { userId, date } })
}

export async function incrementDailyDocCount(userId: string, date: Date): Promise<void> {
  await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { docCount: { increment: 1 } },
    create: { userId, date, docCount: 1 },
  })
}

export async function incrementUserMessageCount(userId: string, date: Date): Promise<void> {
  await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { userMessageCount: { increment: 1 }, messagesCount: { increment: 1 } },
    create: { userId, date, userMessageCount: 1, messagesCount: 1 },
  })
}

export async function incrementAgentMessageCount(userId: string, date: Date): Promise<void> {
  await prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date } },
    update: { agentMessageCount: { increment: 1 }, messagesCount: { increment: 1 } },
    create: { userId, date, agentMessageCount: 1, messagesCount: 1 },
  })
}
