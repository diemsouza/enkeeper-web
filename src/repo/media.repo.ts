import { Media } from "../lib/prisma";
import { MediaParentType } from "../lib/constants";
import { prisma } from "../lib/prisma";

export type CreateMediaData = {
  parentId: string;
  parentType: MediaParentType;
  mediaType: string;
  contentType: string;
  mediaPath: string;
  mediaSize?: number;
  mediaTranscription?: string;
};

export async function createMedia(data: CreateMediaData): Promise<Media> {
  return prisma.media.create({ data });
}

export async function findMediaByParent(
  parentType: MediaParentType,
  parentId: string,
): Promise<Media[]> {
  return prisma.media.findMany({
    where: { parentType, parentId, deletedAt: null },
  });
}

export async function findMediaByParentIds(
  parentType: MediaParentType,
  parentIds: string[],
): Promise<Media[]> {
  return prisma.media.findMany({
    where: { parentType, parentId: { in: parentIds }, deletedAt: null },
  });
}

export async function getMediaById(id: string): Promise<Media | null> {
  return prisma.media.findUnique({ where: { id } });
}

export async function softDeleteMedia(id: string): Promise<void> {
  await prisma.media.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function findMediaEligibleForCleanup(
  mediaType: string,
  threshold: Date,
  limit: number,
): Promise<Media[]> {
  return prisma.media.findMany({
    where: { mediaType, deletedAt: null, createdAt: { lte: threshold } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function countMediaEligibleForCleanup(
  mediaType: string,
  threshold: Date,
): Promise<number> {
  return prisma.media.count({
    where: { mediaType, deletedAt: null, createdAt: { lte: threshold } },
  });
}
