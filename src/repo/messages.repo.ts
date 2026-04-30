import { Message, MessageRole, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

type SaveMessageData = {
  userId: string;
  userChannelId: string;
  role: MessageRole;
  content: string;
  intent?: string;
  externalId?: string;
  mediaType?: string;
  mediaId?: string;
  metadata?: Record<string, string | number | null>;
  activityId?: string;
  // TODO: refactory after run - noteIds removed, replaced by activityId relation
};

export async function saveMessage(data: SaveMessageData): Promise<Message> {
  return prisma.message.create({
    data: {
      userId: data.userId,
      userChannelId: data.userChannelId,
      role: data.role,
      content: data.content,
      intent: data.intent,
      externalId: data.externalId,
      mediaType: data.mediaType,
      mediaId: data.mediaId,
      metadata:
        data.metadata !== undefined
          ? (data.metadata as Prisma.InputJsonObject)
          : undefined,
      activityId: data.activityId,
    },
  });
}

export async function findLastUserMessage(
  userId: string,
): Promise<Message | null> {
  return prisma.message.findFirst({
    where: { userId, role: "user" },
    orderBy: { createdAt: "desc" },
  });
}

export async function findMessagesSince(
  userId: string,
  since: Date,
): Promise<Message[]> {
  return prisma.message.findMany({
    where: { userId, createdAt: { gt: since } },
    orderBy: { createdAt: "asc" },
  });
}

export async function findLastAssistantMessage(
  userId: string,
): Promise<Message | null> {
  return prisma.message.findFirst({
    where: { userId, role: "assistant" },
    orderBy: { createdAt: "desc" },
  });
}

export async function findLastActivityMessage(
  activityId: string,
): Promise<Message | null> {
  return prisma.message.findFirst({
    where: { activityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function findLastMessageByIntent(
  activityId: string,
  intent: string,
): Promise<Message | null> {
  return prisma.message.findFirst({
    where: { activityId, intent },
    orderBy: { createdAt: "desc" },
  });
}
