import { Note, NoteType } from '@prisma/client'
import { prisma } from '../lib/prisma'

type CreateNoteData = {
  userId: string
  noteType: NoteType
  content: string
  rawContent?: string
  fileUrl?: string
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
  data: { content: string; rawContent?: string },
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
