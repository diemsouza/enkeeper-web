import { Message } from "../lib/prisma";
import { MessageChannel } from "../types/message-channel";
import { FormattedMessage } from "../types/out-message";
import { saveMessage } from "../repo/messages.repo";
import { incrementAgentMessageCount } from "../repo/daily-usage.repo";
import {
  MEDIA_TYPE,
  MIN_DELAY_FOR_TYPING_MS,
  TYPING_LEAD_MS,
} from "../lib/constants";
import { delay } from "../lib/utils";

type SendAndSaveMessageParams = {
  channel: MessageChannel;
  to: string;
  userId: string;
  userChannelId: string;
  message: FormattedMessage;
  intent?: string;
  activityId?: string;
  questionId?: string;
  today?: Date;
};

function resolveMessageMedia(
  message: FormattedMessage,
): { mediaType?: string; mediaId?: string } {
  if (message.imageMediaId) {
    return { mediaType: MEDIA_TYPE.IMAGE, mediaId: message.imageMediaId };
  }
  if (message.audioMediaId) {
    return { mediaType: MEDIA_TYPE.AUDIO, mediaId: message.audioMediaId };
  }
  return {};
}

export async function sendAndSaveMessage(
  params: SendAndSaveMessageParams,
): Promise<Message> {
  const { channel, to, message, today, ...rest } = params;
  const result = await channel.sendMessage(to, message);
  const saved = await saveMessage({
    ...rest,
    ...resolveMessageMedia(message),
    role: "assistant",
    content: message.text,
    templateName: message.templateName,
    interactive: message.interactive,
    externalId: result.externalId ?? undefined,
  });
  if (today) await incrementAgentMessageCount(rest.userId, today);
  return saved;
}

type WaitBeforeSendOptions = { typing?: boolean; replyToMessageId?: string };

// Pausa deliberada entre mensagens de uma sequencia: o "digitando" so aparece
// nos ultimos TYPING_LEAD_MS, e pausas curtas saem em silencio.
export async function waitBeforeSend(
  channel: MessageChannel,
  userId: string,
  totalDelayMs: number,
  opts: WaitBeforeSendOptions = {},
): Promise<void> {
  const { typing = true, replyToMessageId } = opts;

  if (!typing || totalDelayMs < MIN_DELAY_FOR_TYPING_MS) {
    await delay(totalDelayMs / 1000);
    return;
  }

  await delay((totalDelayMs - TYPING_LEAD_MS) / 1000);
  await channel.notifyTyping(userId, { replyToMessageId });
  await delay(TYPING_LEAD_MS / 1000);
}

export function trackChannelSends(channel: MessageChannel): {
  channel: MessageChannel;
  hasSent: () => boolean;
} {
  let sent = false;
  const tracked: MessageChannel = {
    sendMessage: async (to, message) => {
      const result = await channel.sendMessage(to, message);
      sent = true;
      return result;
    },
    sendTemplate: async (to, template, bodyParams, buttonUrlParam) => {
      const result = await channel.sendTemplate(
        to,
        template,
        bodyParams,
        buttonUrlParam,
      );
      sent = true;
      return result;
    },
    notifyTyping: (userId, ctx) => channel.notifyTyping(userId, ctx),
    notifyTypingStop: (userId) => channel.notifyTypingStop(userId),
  };
  return { channel: tracked, hasSent: () => sent };
}
