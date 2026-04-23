import { ChannelType, User, UserChannel } from '@prisma/client'
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

export async function createUserWithChannel(
  channelType: ChannelType,
  channelId: string,
  channelCode?: string,
): Promise<UserWithChannels> {
  return prisma.$transaction(async tx => {
    const user = await tx.user.create({ data: {} })
    await tx.userChannel.create({
      data: { userId: user.id, channelType, channelId, channelCode },
    })
    return tx.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { channels: true },
    })
  })
}
