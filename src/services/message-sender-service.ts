import { Message } from "../lib/prisma";
import { MessageChannel } from "../types/message-channel";
import { FormattedMessage } from "../types/out-message";
import { saveMessage } from "../repo/messages.repo";
import { incrementAgentMessageCount } from "../repo/daily-usage.repo";
import { MEDIA_TYPE } from "../lib/constants";

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
