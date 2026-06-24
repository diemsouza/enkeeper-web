import {
  ChannelType as PrismaChannelType,
  User,
  UserChannel,
} from "../lib/prisma";
import { createUserWithChannel, findUserByChannel } from "../repo/users.repo";
import { ChannelType } from "../types/domain";
import { TRIAL_DAYS } from "../lib/constants";
import { sendWhatsAppMessage } from "../vendors/whatsapp.vendor";

type UserWithChannels = User & { channels: UserChannel[] };

export async function findOrCreateUserByChannel(
  channelType: ChannelType,
  channelId: string,
  channelCode?: string,
  name?: string,
): Promise<UserWithChannels> {
  const prismaChannelType = channelType as PrismaChannelType;
  const existing = await findUserByChannel(prismaChannelType, channelId);
  if (existing) return existing;
  const planExpiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const user = await createUserWithChannel(
    prismaChannelType,
    channelId,
    channelCode,
    planExpiresAt,
  );
  const waSupport = process.env.WA_SUPPORT;
  if (waSupport && channelId !== waSupport) {
    try {
      await sendWhatsAppMessage(
        waSupport,
        `*Novo cadastro* 🎉\nNome: ${name ?? "Não identificado"}\nTelefone: +${channelId.replace("+", "")}`,
      );
    } catch {
      // falha silenciosa
    }
  }
  return user;
}
