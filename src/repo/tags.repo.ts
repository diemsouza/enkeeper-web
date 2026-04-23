import { Tag } from '@prisma/client'
import { prisma } from '../lib/prisma'

export async function findTagsByUser(userId: string): Promise<Tag[]> {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { noteCount: 'desc' },
  })
}

export async function findOrCreateTag(userId: string, name: string): Promise<Tag> {
  return prisma.tag.upsert({
    where: { userId_name: { userId, name } },
    create: { userId, name },
    update: {},
  })
}

export async function attachTagsToNote(noteId: string, tagIds: string[]): Promise<void> {
  await prisma.noteTag.createMany({
    data: tagIds.map(tagId => ({ noteId, tagId })),
    skipDuplicates: true,
  })
}

export async function detachTagsFromNote(noteId: string): Promise<void> {
  await prisma.noteTag.deleteMany({ where: { noteId } })
}

export async function incrementTagCount(tagId: string): Promise<void> {
  await prisma.tag.update({
    where: { id: tagId },
    data: { noteCount: { increment: 1 } },
  })
}

export async function decrementTagCount(tagId: string): Promise<void> {
  await prisma.tag.update({
    where: { id: tagId },
    data: { noteCount: { decrement: 1 } },
  })
}

export async function countUserTags(userId: string): Promise<number> {
  return prisma.tag.count({ where: { userId } })
}
