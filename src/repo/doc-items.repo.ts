import { DocItem, DocType } from "@prisma/client";
import { prisma } from "../lib/prisma";

type CreateDocItemData = {
  docId: string;
  userId: string;
  messageId?: string;
  docType: DocType;
  rawContent: string;
  error?: string;
  order: number;
};

export async function createDocItem(data: CreateDocItemData): Promise<DocItem> {
  return prisma.docItem.create({ data });
}

export async function findDocItemsByDoc(docId: string): Promise<DocItem[]> {
  return prisma.docItem.findMany({
    where: { docId },
    orderBy: { order: "asc" },
  });
}

export async function countValidDocItemsByDoc(docId: string): Promise<number> {
  return prisma.docItem.count({
    where: { docId, error: null },
  });
}

export async function findLatestDocItem(docId: string): Promise<DocItem | null> {
  return prisma.docItem.findFirst({
    where: { docId },
    orderBy: { createdAt: "desc" },
  });
}
