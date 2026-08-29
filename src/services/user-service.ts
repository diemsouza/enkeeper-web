import {
  ChannelType as PrismaChannelType,
  Prisma,
  User,
  UserChannel,
} from "../lib/prisma";
import { findOrCreateUserChannel } from "../repo/users.repo";
import { ChannelType } from "../types/domain";
import { TRIAL_DAYS, UserSource } from "../lib/constants";
import { sendWhatsAppTemplate } from "../vendors/whatsapp.vendor";

type UserWithChannels = User & { channels: UserChannel[] };

export async function findOrCreateUserByChannel(
  channelType: ChannelType,
  channelUserId: string,
  channelUserPhone?: string,
  channelUsername?: string,
  name?: string,
  source?: UserSource | null,
  sourceData?: Record<string, unknown> | null,
): Promise<{ user: UserWithChannels; userChannel: UserChannel }> {
  const prismaChannelType = channelType as PrismaChannelType;
  const planExpiresAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const { user, userChannel, isNew } = await findOrCreateUserChannel(
    prismaChannelType,
    channelUserId,
    channelUserPhone,
    channelUsername,
    planExpiresAt,
    source,
    sourceData as Prisma.InputJsonValue | null | undefined,
  );

  const waSupport = process.env.WA_SUPPORT;
  if (isNew && waSupport && channelUserPhone !== waSupport) {
    try {
      await sendWhatsAppTemplate(waSupport, "new_user_notification", [
        user.id,
        name ?? "Não identificado",
        `+${(channelUserPhone ?? channelUserId).replace("+", "")}`,
      ]);
    } catch (error) {
      console.error(
        "[findOrCreateUserByChannel] Failed to notify WA_SUPPORT",
        error,
      );
    }
  }
  return { user, userChannel };
}
