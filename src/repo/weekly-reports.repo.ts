import { WeeklyReport, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

type CreateWeeklyReportData = {
  userId: string
  reportContent: string
  summaryData: Prisma.InputJsonObject
  sentAt?: Date
}

export async function createWeeklyReport(data: CreateWeeklyReportData): Promise<WeeklyReport> {
  return prisma.weeklyReport.create({ data })
}

export async function findWeeklyReportById(id: string, userId: string): Promise<WeeklyReport | null> {
  return prisma.weeklyReport.findFirst({
    where: { id, userId, deletedAt: null },
  })
}

export async function findWeeklyReportsByUser(userId: string): Promise<WeeklyReport[]> {
  return prisma.weeklyReport.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export async function markWeeklyReportSent(id: string, userId: string): Promise<void> {
  await prisma.weeklyReport.updateMany({
    where: { id, userId, deletedAt: null },
    data: { sentAt: new Date() },
  })
}

export async function softDeleteWeeklyReport(id: string, userId: string): Promise<void> {
  await prisma.weeklyReport.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
}
