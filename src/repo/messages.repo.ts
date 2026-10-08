import {
  ExternalMessageStatus,
  Message,
  MessageRole,
  Prisma,
} from "../lib/prisma";
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

export async function findMessagesByActivity(
  activityId: string,
  userId: string,
  sinceDate: Date,
): Promise<Message[]> {
  return prisma.message.findMany({
    where: {
      userId,
      createdAt: { gte: sinceDate },
      OR: [{ activityId }, { activityId: null }],
    },
    orderBy: { createdAt: "asc" },
  });
}

export type MessageWithMedia = Message & {
  media: { contentType: string } | null;
};

export async function findMessagesPage(
  userId: string,
  before: string | undefined,
  limit: number,
): Promise<MessageWithMedia[]> {
  return prisma.message.findMany({
    where: { userId },
    include: { media: { select: { contentType: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
  });
}

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
  userId?: string,
): Promise<Message | null> {
  return prisma.message.findFirst({
    where: { externalId, ...(userId ? { userId } : {}) },
  });
}

export async function countActivityAudios(
  activityId: string,
): Promise<{ sent: number; played: number }> {
  const base = {
    activityId,
    role: "assistant" as MessageRole,
    mediaType: "audio",
  };
  const [sent, played] = await Promise.all([
    prisma.message.count({ where: base }),
    prisma.message.count({ where: { ...base, playedAt: { not: null } } }),
  ]);
  return { sent, played };
}

export async function findUserMessageDatesByActivity(
  activityId: string,
): Promise<Date[]> {
  const rows = await prisma.message.findMany({
    where: { activityId, role: "user" },
    select: { createdAt: true },
  });
  return rows.map((r) => r.createdAt);
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

export async function findOptionListMessagesByQuestion(
  userId: string,
  questionId: string,
): Promise<Pick<Message, "id" | "interactive">[]> {
  return prisma.message.findMany({
    where: {
      userId,
      questionId,
      role: "assistant",
      interactive: { path: ["isOptionList"], equals: true },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, interactive: true },
    take: 5,
  });
}

export async function findOptionListMessageById(
  id: string,
  userId: string,
): Promise<Pick<Message, "id" | "interactive"> | null> {
  return prisma.message.findFirst({
    where: {
      id,
      userId,
      role: "assistant",
      interactive: { path: ["isOptionList"], equals: true },
    },
    select: { id: true, interactive: true },
  });
}

export async function updateMessageInteractive(
  id: string,
  userId: string,
  interactive: NonNullable<FormattedMessage["interactive"]>,
): Promise<void> {
  await prisma.message.updateMany({
    where: { id, userId },
    data: { interactive: interactive as Prisma.InputJsonObject },
  });
}
