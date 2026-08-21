import { ExternalMessageStatus, Message, MessageRole, Prisma } from "../lib/prisma";
import { prisma } from "../lib/prisma";
import type { FormattedMessage } from "../types/out-message";

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
  templateName?: string | null;
  interactive?: FormattedMessage["interactive"];
  activityId?: string;
  questionId?: string;
  receivedAt?: Date;
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
      templateName: data.templateName,
      interactive:
        data.interactive !== undefined
          ? (data.interactive as Prisma.InputJsonObject)
          : undefined,
      activityId: data.activityId,
      questionId: data.questionId,
      createdAt: data.receivedAt,
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

export async function findLastUserMessageByActivity(
  activityId: string,
): Promise<Message | null> {
  return prisma.message.findFirst({
    where: { activityId, role: "user" },
    orderBy: { createdAt: "desc" },
  });
}

export async function findMessageByExternalId(
  externalId: string,
): Promise<Message | null> {
  return prisma.message.findFirst({ where: { externalId } });
}

export async function markMessagePlayedIfUnset(
  id: string,
  playedAt: Date,
): Promise<boolean> {
  const result = await prisma.message.updateMany({
    where: { id, playedAt: null },
    data: { playedAt },
  });
  return result.count > 0;
}

export async function updateMessageExternalStatus(
  id: string,
  status: ExternalMessageStatus,
  statusAt: Date,
): Promise<void> {
  await prisma.message.update({
    where: { id },
    data: { externalStatus: status, externalStatusAt: statusAt },
  });
}
