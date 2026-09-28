import {
  ChannelType as PrismaChannelType,
  Prisma,
  User,
  UserChannel,
} from "../lib/prisma";
import {
  findOrCreateUserChannel,
  findUserChannelByPhone,
  upsertWebUserChannel,
} from "../repo/users.repo";
import { ChannelType } from "../types/domain";
import { TRIAL_DAYS } from "../lib/constants";
import { sendSupportEmail } from "../vendors/email.vendor";
import {
  AttributionCookie,
  hasAttributionSignal,
  resolveSource,
} from "../core/attribution";

type UserWithChannels = User & { channels: UserChannel[] };

export async function findOrCreateUserByChannel(
  channelType: ChannelType,
  channelUserId: string,
  channelUserPhone?: string,
  channelUsername?: string,
  name?: string,
  source?: string | null,
  sourceData?: Record<string, unknown> | null,
  timezone?: string,
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
    timezone,
  );

  if (isNew) {
    await sendSupportEmail({
      subject: "Novo usuário",
      title: "Novo usuário cadastrado",
      fields: [
        { label: "ID", value: user.id },
        { label: "Nome", value: name ?? "Não identificado" },
        {
          label: "Telefone",
          value: `+${(channelUserPhone ?? channelUserId).replace("+", "")}`,
        },
        { label: "Canal", value: channelType },
        { label: "Origem", value: source ?? "-" },
      ],
    });
  }
  return { user, userChannel };
}

// Login web por telefone: reconhece usuário legado de outro canal (hoje só
// whatsapp) e traz o histórico dele para um canal "web" novo, em vez de
// criar conta do zero. O canal de origem nunca é alterado.
export async function resolveWebLoginByPhone(
  phone: string,
  timezone?: string,
  attribution?: AttributionCookie | null,
): Promise<{ user: UserWithChannels; userChannel: UserChannel }> {
  const existingWeb = await findUserChannelByPhone(phone, {
    channelType: "web",
  });
  if (existingWeb) return existingWeb;

  const otherType = await findUserChannelByPhone(phone, {
    channelTypeNot: "web",
  });
  if (otherType) {
    const userChannel = await upsertWebUserChannel(otherType.user.id, phone);
    return { user: otherType.user, userChannel };
  }

  return findOrCreateUserByChannel(
    "web",
    phone,
    phone,
    undefined,
    undefined,
    resolveSource(attribution ?? null),
    hasAttributionSignal(attribution ?? null) ? attribution : null,
    timezone,
  );
}
