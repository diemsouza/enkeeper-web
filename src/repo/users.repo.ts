import { ChannelType, PlanStatus, User, UserChannel } from '@prisma/client'
import { prisma } from '../lib/prisma'

type UserWithChannels = User & { channels: UserChannel[] }

export async function findUserByChannel(
  channelType: ChannelType,
  channelId: string,
): Promise<UserWithChannels | null> {
  const channel = await prisma.userChannel.findFirst({
    where: { channelType, channelId },
    include: { user: { include: { channels: true } } },
  })
  return channel?.user ?? null
}

export async function markUserOnboarded(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
  })
}

export async function updateUserName(userId: string, name: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { name },
  })
}

export async function updateUserPlanStatus(userId: string, planStatus: PlanStatus): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { planStatus },
  })
}

export async function findUserChannelByUserId(
  userId: string,
  channelType: ChannelType = 'whatsapp',
): Promise<UserChannel | null> {
  return prisma.userChannel.findFirst({
    where: { userId, channelType },
  })
}

export async function createUserWithChannel(
  channelType: ChannelType,
  channelId: string,
  channelCode?: string,
  planExpiresAt?: Date,
): Promise<UserWithChannels> {
  return prisma.$transaction(async tx => {
    const user = await tx.user.create({
      data: { planCode: 'trial', planStatus: 'active', planExpiresAt },
    })
    await tx.userChannel.create({
      data: { userId: user.id, channelType, channelId, channelCode },
    })
    return tx.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { channels: true },
    })
  })
}
