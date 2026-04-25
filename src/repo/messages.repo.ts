import { Message, MessageRole, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'

type SaveMessageData = {
  userId: string
  userChannelId: string
  role: MessageRole
  content: string
  intent?: string
  externalId?: string
  mediaType?: string
  mediaId?: string
  metadata?: Record<string, string | number | null>
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
      metadata: data.metadata !== undefined
        ? (data.metadata as Prisma.InputJsonObject)
        : undefined,
    },
  })
}

export async function findLastUserMessage(userId: string): Promise<Message | null> {
  return prisma.message.findFirst({
    where: { userId, role: 'user' },
    orderBy: { createdAt: 'desc' },
  })
}
