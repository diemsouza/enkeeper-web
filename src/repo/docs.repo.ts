import { Doc, DocStatus, DocType, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

type CreateDocData = {
  userId: string
  messageId?: string
  title: string
  docType: DocType
  rawContent: string
  content: string
  topicsData: Prisma.InputJsonValue
  status?: DocStatus
}

type UpdateDocData = {
  title?: string
  content?: string
  topicsData?: Prisma.InputJsonValue
  status?: DocStatus
}

export async function createDoc(data: CreateDocData): Promise<Doc> {
  return prisma.doc.create({ data })
}

export async function findDocById(id: string, userId: string): Promise<Doc | null> {
  return prisma.doc.findFirst({
    where: { id, userId, deletedAt: null },
  })
}

export async function findDocsByUser(userId: string): Promise<Doc[]> {
  return prisma.doc.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export async function findActiveDocsByUser(userId: string): Promise<Doc[]> {
  return prisma.doc.findMany({
    where: { userId, status: 'active', deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateDoc(
  id: string,
  userId: string,
  data: UpdateDocData,
): Promise<void> {
  await prisma.doc.updateMany({
    where: { id, userId, deletedAt: null },
    data,
  })
}

export async function softDeleteDoc(id: string, userId: string): Promise<void> {
  await prisma.doc.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
}

export async function countActiveDocsByUser(userId: string): Promise<number> {
  return prisma.doc.count({
    where: { userId, deletedAt: null },
  })
}
