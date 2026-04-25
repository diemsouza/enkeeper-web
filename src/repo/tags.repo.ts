import { Tag } from '@prisma/client'
import { prisma } from '../lib/prisma'

export async function findTagsByUser(userId: string): Promise<Tag[]> {
  return prisma.tag.findMany({
    where: { userId, deletedAt: null },
    orderBy: { noteCount: 'desc' },
  })
}

export async function findOrCreateTag(userId: string, name: string): Promise<Tag> {
  return prisma.tag.upsert({
    where: { userId_name: { userId, name } },
    create: { userId, name },
    update: { deletedAt: null },
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
  return prisma.tag.count({ where: { userId, deletedAt: null } })
}

export async function countNotesByTag(userId: string, tagName: string): Promise<number | null> {
  const tag = await prisma.tag.findFirst({ where: { userId, name: tagName, deletedAt: null } })
  if (!tag) return null
  return tag.noteCount
}

export async function renameTag(userId: string, oldName: string, newName: string): Promise<Tag | null> {
  const tag = await prisma.tag.findFirst({ where: { userId, name: oldName, deletedAt: null } })
  if (!tag) return null
  return prisma.tag.update({ where: { id: tag.id }, data: { name: newName } })
}

export async function findTagNamesByNote(noteId: string): Promise<string[]> {
  const relations = await prisma.noteTag.findMany({
    where: { noteId },
    select: { tag: { select: { name: true } } },
  })
  return relations.map(r => r.tag.name)
}

export async function findTagsByNames(userId: string, names: string[]): Promise<Tag[]> {
  if (names.length === 0) return []
  return prisma.tag.findMany({ where: { userId, name: { in: names } } })
}

export async function deleteTag(userId: string, tagName: string): Promise<void> {
  await prisma.$transaction(async tx => {
    const tag = await tx.tag.findFirst({ where: { userId, name: tagName, deletedAt: null } })
    if (!tag) return
    await tx.noteTag.deleteMany({ where: { tagId: tag.id } })
    await tx.tag.update({ where: { id: tag.id }, data: { deletedAt: new Date() } })
  })
}
