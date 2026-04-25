import { Note, NoteType } from '@prisma/client'
import { prisma } from '../lib/prisma'

type CreateNoteData = {
  userId: string
  noteType: NoteType
  content: string
  mediaType?: string
  fileUrl?: string
  messageId?: string
}

export async function createNote(data: CreateNoteData): Promise<Note> {
  return prisma.note.create({ data })
}

export async function findNoteById(id: string, userId: string): Promise<Note | null> {
  return prisma.note.findFirst({
    where: { id, userId, deletedAt: null },
  })
}

export async function softDeleteNote(id: string, userId: string): Promise<void> {
  await prisma.note.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  })
}

export async function updateNote(
  id: string,
  userId: string,
  data: { content: string },
): Promise<void> {
  await prisma.note.updateMany({
    where: { id, userId, deletedAt: null },
    data,
  })
}

export async function searchNotes(
  userId: string,
  query: string,
): Promise<Pick<Note, 'id' | 'content' | 'createdAt'>[]> {
  return prisma.note.findMany({
    where: {
      userId,
      deletedAt: null,
      content: { contains: query, mode: 'insensitive' },
    },
    select: { id: true, content: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function findNotesByTag(
  userId: string,
  tagName: string,
): Promise<Pick<Note, 'id' | 'content' | 'createdAt'>[]> {
  return prisma.note.findMany({
    where: {
      userId,
      deletedAt: null,
      noteTagRelations: {
        some: { tag: { name: tagName, userId } },
      },
    },
    select: { id: true, content: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
}

type NoteWithTags = {
  id: string
  content: string
  noteType: NoteType
  createdAt: Date
  noteTagRelations: { tag: { name: string } }[]
}

export async function findNotesByDateRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<NoteWithTags[]> {
  return prisma.note.findMany({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: from, lt: to },
    },
    select: {
      id: true,
      content: true,
      noteType: true,
      createdAt: true,
      noteTagRelations: {
        select: { tag: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000

function filterToDateRange(filter: 'today' | 'yesterday' | 'week'): { from: Date; to: Date } {
  const now = new Date()
  const brazil = new Date(now.getTime() - BRAZIL_OFFSET_MS)
  const midnight = new Date(Date.UTC(brazil.getUTCFullYear(), brazil.getUTCMonth(), brazil.getUTCDate()))
  const todayStart = new Date(midnight.getTime() + BRAZIL_OFFSET_MS)
  if (filter === 'today') return { from: todayStart, to: now }
  if (filter === 'yesterday') {
    const yesterdayStart = new Date(todayStart.getTime() - 86400000)
    return { from: yesterdayStart, to: todayStart }
  }
  return { from: new Date(now.getTime() - 7 * 86400000), to: now }
}

export async function findNoteByUserIndex(
  userId: string,
  index: number,
  filter: 'today' | 'yesterday' | 'week',
): Promise<Note | null> {
  const { from, to } = filterToDateRange(filter)
  const results = await prisma.note.findMany({
    where: { userId, deletedAt: null, createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: 'desc' },
    skip: index - 1,
    take: 1,
  })
  return results[0] ?? null
}

export async function hasAnyNotes(userId: string): Promise<boolean> {
  const note = await prisma.note.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  return note !== null;
}

export async function countTodayNotes(userId: string, date: Date): Promise<number> {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)

  return prisma.note.count({
    where: {
      userId,
      deletedAt: null,
      createdAt: { gte: start, lt: end },
    },
  })
}
