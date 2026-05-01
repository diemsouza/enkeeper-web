import { Activity, Approach, ApproachConfidence, ActivityStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'

type CreateActivityData = {
  userId: string
  docId: string
  date: Date
  topicIndex?: number
  nextMessageAt?: Date
  intervalMinutes?: number
  status?: ActivityStatus
  approach?: Approach
  approachConfidence?: ApproachConfidence
  approachOverride?: Approach
}

type UpdateActivityData = {
  topicIndex?: number
  nextMessageAt?: Date | null
  intervalMinutes?: number
  executionCount?: number
  approach?: Approach
  approachConfidence?: ApproachConfidence
  approachOverride?: Approach
  waitingUser?: boolean
  status?: ActivityStatus
  pausedAt?: Date | null
  completedAt?: Date | null
}

export async function createActivity(data: CreateActivityData): Promise<Activity> {
  return prisma.activity.create({ data })
}

export async function findActivityById(id: string, userId: string): Promise<Activity | null> {
  return prisma.activity.findFirst({
    where: { id, userId, deletedAt: null },
  })
}

export async function findActivityByDocAndDate(
  userId: string,
  docId: string,
  date: Date,
): Promise<Activity | null> {
  return prisma.activity.findFirst({
    where: { userId, docId, date, deletedAt: null },
  })
}

export async function findActiveActivitiesByUser(userId: string): Promise<Activity[]> {
  return prisma.activity.findMany({
    where: { userId, status: 'active', deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export async function findEligibleActivities(limit = 100): Promise<Activity[]> {
  return prisma.activity.findMany({
    where: {
      status: 'active',
      deletedAt: null,
      nextMessageAt: { lte: new Date() },
    },
    orderBy: { nextMessageAt: 'asc' },
    take: limit,
  })
}

export async function findActivitiesByDoc(docId: string, userId: string): Promise<Activity[]> {
  return prisma.activity.findMany({
    where: { docId, userId, deletedAt: null },
    orderBy: { date: 'desc' },
  })
}

export async function updateActivity(
  id: string,
  userId: string,
  data: UpdateActivityData,
): Promise<void> {
  await prisma.activity.updateMany({
    where: { id, userId, deletedAt: null },
    data,
  })
}

export async function softDeleteActivity(id: string, userId: string): Promise<void> {
  await prisma.activity.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
}

export async function softDeleteActivitiesByDoc(docId: string, userId: string): Promise<void> {
  await prisma.activity.updateMany({
    where: { docId, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
}

export async function pauseActivitiesByDoc(docId: string, userId: string): Promise<void> {
  await prisma.activity.updateMany({
    where: { docId, userId, status: 'active', deletedAt: null },
    data: { status: 'paused', pausedAt: new Date() },
  })
}

export async function resumeActivitiesByDoc(docId: string, userId: string): Promise<void> {
  await prisma.activity.updateMany({
    where: { docId, userId, status: 'paused', deletedAt: null },
    data: { status: 'active', pausedAt: null },
  })
}

export async function completeActivity(id: string, userId: string): Promise<void> {
  await prisma.activity.updateMany({
    where: { id, userId, deletedAt: null },
    data: { status: 'completed', completedAt: new Date(), nextMessageAt: null },
  })
}

