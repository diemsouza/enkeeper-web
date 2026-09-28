import type { ChannelType } from "../prisma";
import type { MessageChannel } from "../../types/message-channel";
import { DEFAULT_CHANNEL_TYPE } from "../constants";
import { WebChannel } from "./web-channel";
import { WhatsAppChannel } from "./whatsapp-channel";

export function resolveChannel(
  channelType: ChannelType = DEFAULT_CHANNEL_TYPE,
): MessageChannel {
  if (channelType === "whatsapp") return new WhatsAppChannel();
  return new WebChannel();
}
