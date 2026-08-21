import { Message } from "../lib/prisma";
import { MessageChannel } from "../types/message-channel";
import { FormattedMessage } from "../types/out-message";
import { saveMessage } from "../repo/messages.repo";
import { incrementAgentMessageCount } from "../repo/daily-usage.repo";

type SendAndSaveMessageParams = {
  channel: MessageChannel;
  to: string;
  userId: string;
  userChannelId: string;
  message: FormattedMessage;
  intent?: string;
  activityId?: string;
  questionId?: string;
  mediaType?: string;
  mediaId?: string;
  today?: Date;
};

export async function sendAndSaveMessage(
  params: SendAndSaveMessageParams,
): Promise<Message> {
  const { channel, to, message, today, ...rest } = params;
  const result = await channel.sendMessage(to, message);
  const saved = await saveMessage({
    ...rest,
    role: "assistant",
    content: message.text,
    templateName: message.templateName,
    interactive: message.interactive,
    externalId: result.externalId ?? undefined,
  });
  if (today) await incrementAgentMessageCount(rest.userId, today);
  return saved;
}
