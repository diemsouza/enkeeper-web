import { Doc, DocSource, DocStatus, DocType, Level, Prisma } from "../lib/prisma";
import { prisma } from "../lib/prisma";

type CreateDocData = {
  userId: string;
  title?: string;
  docType: DocType;
  rawContent?: string;
  content?: string;
  status?: DocStatus;
  level?: Level;
  source?: DocSource;
  metadata?: Prisma.InputJsonValue;
};

type UpdateDocData = {
  title?: string;
  content?: string;
  rawContent?: string;
  level?: Level;
  status?: DocStatus;
  docType?: DocType;
  error?: string;
};

export async function createDoc(data: CreateDocData): Promise<Doc> {
  return prisma.doc.create({ data });
}

export async function findDocById(
  id: string,
  userId: string,
): Promise<Doc | null> {
  return prisma.doc.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

export async function updateDoc(
  id: string,
  userId: string,
  data: UpdateDocData,
): Promise<void> {
  await prisma.doc.updateMany({
    where: { id, userId, deletedAt: null },
    data,
  });
}

export async function softDeleteDoc(id: string, userId: string): Promise<void> {
  await prisma.doc.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}

export async function countActiveDocsByUser(userId: string): Promise<number> {
  return prisma.doc.count({
    where: { userId, deletedAt: null },
  });
}

export async function findPendingDocByUser(userId: string): Promise<Doc | null> {
  return prisma.doc.findFirst({
    where: { userId, status: "pending", deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}
