import { ChannelType as PrismaChannelType, User, UserChannel } from '@prisma/client'
import { createUserWithChannel, findUserByChannel } from '../repo/users.repo'
import { ChannelType } from '../types/domain'

type UserWithChannels = User & { channels: UserChannel[] }

export async function findOrCreateUserByChannel(
  channelType: ChannelType,
  channelId: string,
  channelCode?: string,
): Promise<UserWithChannels> {
  const prismaChannelType = channelType as PrismaChannelType
  const existing = await findUserByChannel(prismaChannelType, channelId)
  if (existing) return existing
  return createUserWithChannel(prismaChannelType, channelId, channelCode)
}
