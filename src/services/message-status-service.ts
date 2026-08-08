import { ExternalMessageStatus } from "../lib/prisma";
import { mapWhatsAppStatus } from "../vendors/whatsapp.vendor";
import {
  findMessageByExternalId,
  markMessagePlayedIfUnset,
  updateMessageExternalStatus,
} from "../repo/messages.repo";

export async function markMessageAsPlayed(
  externalId: string,
  timestamp?: Date,
): Promise<void> {
  const message = await findMessageByExternalId(externalId);
  if (!message) return;
  await markMessagePlayedIfUnset(message.id, timestamp ?? new Date());
}

export async function markMessageExternalStatus(
  externalId: string,
  status: ExternalMessageStatus,
  timestamp?: Date,
): Promise<void> {
  const message = await findMessageByExternalId(externalId);
  if (!message) return;
  await updateMessageExternalStatus(message.id, status, timestamp ?? new Date());
}

export async function processWhatsAppStatusEvent(
  rawStatus: string,
  externalId: string,
  timestamp?: Date,
): Promise<void> {
  if (rawStatus === "played") {
    await markMessageAsPlayed(externalId, timestamp);
    return;
  }
  const mapped = mapWhatsAppStatus(rawStatus);
  if (mapped) {
    await markMessageExternalStatus(externalId, mapped, timestamp);
  }
}
