import {
  ChannelType as PrismaChannelType,
  User,
  UserChannel,
} from "../lib/prisma";
import { findOrCreateUserChannel } from "../repo/users.repo";
import { ChannelType } from "../types/domain";
import { TRIAL_DAYS } from "../lib/constants";
import { sendWhatsAppMessage } from "../vendors/whatsapp.vendor";

type UserWithChannels = User & { channels: UserChannel[] };

export async function findOrCreateUserByChannel(
  channelType: ChannelType,
  channelUserId: string,
  channelUserPhone?: string,
  channelUsername?: string,
  name?: string,
): Promise<{ user: UserWithChannels; userChannel: UserChannel }> {
  const prismaChannelType = channelType as PrismaChannelType;
  const planExpiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const { user, userChannel, isNew } = await findOrCreateUserChannel(
    prismaChannelType,
    channelUserId,
    channelUserPhone,
    channelUsername,
    planExpiresAt,
  );

  const waSupport = process.env.WA_SUPPORT;
  if (isNew && waSupport && channelUserPhone !== waSupport) {
    try {
      await sendWhatsAppMessage(
        waSupport,
        `👤 *Novo cadastro* \nNome: ${name ?? "Não identificado"}\nTelefone: +${(channelUserPhone ?? channelUserId).replace("+", "")}`,
      );
    } catch (error) {
      console.error(
        "[findOrCreateUserByChannel] Failed to notify WA_SUPPORT",
        error,
      );
    }
  }
  return { user, userChannel };
}
