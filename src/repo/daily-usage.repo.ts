import { DailyUsage } from '@prisma/client'
import { prisma } from '../lib/prisma'

function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function getTodayUsage(userId: string, date: Date): Promise<DailyUsage | null> {
  return prisma.dailyUsage.findUnique({
    where: { userId_date: { userId, date: toDateOnly(date) } },
  })
}

export async function incrementDailyUsage(userId: string, date: Date): Promise<DailyUsage> {
  const normalizedDate = toDateOnly(date)
  return prisma.dailyUsage.upsert({
    where: { userId_date: { userId, date: normalizedDate } },
    create: { userId, date: normalizedDate, noteCount: 1 },
    update: { noteCount: { increment: 1 } },
  })
}
