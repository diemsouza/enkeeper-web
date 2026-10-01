import { Media, Prisma } from "../lib/prisma";
import { MediaParentType, MediaSource } from "../lib/constants";
import { prisma } from "../lib/prisma";

export type CreateMediaData = {
  id?: string;
  userId: string;
  source: MediaSource;
  parentId: string;
  parentType: MediaParentType;
  mediaType: string;
  contentType: string;
  mediaPath: string;
  mediaSize?: number;
  mediaTranscription?: string;
  metadata?: Record<string, unknown>;
};

export async function createMedia(data: CreateMediaData): Promise<Media> {
  const { metadata, ...rest } = data;
  return prisma.media.create({
    data: {
      ...rest,
      metadata:
        metadata !== undefined
          ? (metadata as Prisma.InputJsonObject)
          : undefined,
    },
  });
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
  mediaType: string,
): Promise<Media[]> {
  return prisma.media.findMany({
    where: {
      parentType,
      parentId: { in: parentIds },
      mediaType,
      deletedAt: null,
    },
  });
}

export async function getMediaById(id: string): Promise<Media | null> {
  return prisma.media.findUnique({ where: { id } });
}

export async function findUserMediaById(
  id: string,
  userId: string,
): Promise<Pick<Media, "mediaPath"> | null> {
  return prisma.media.findFirst({
    where: { id, userId, deletedAt: null },
    select: { mediaPath: true },
  });
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
