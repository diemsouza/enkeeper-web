import { Message } from "../lib/prisma";
import { MessageChannel } from "../types/message-channel";
import { OutMessage } from "../types/out-message";
import { saveMessage } from "../repo/messages.repo";
import { incrementAgentMessageCount } from "../repo/daily-usage.repo";

type SendAndSaveMessageParams = {
  channel: MessageChannel;
  to: string;
  userId: string;
  userChannelId: string;
  content: string;
  part?: OutMessage;
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
  const { channel, to, part, content, today, ...rest } = params;
  const result = await channel.sendMessage(to, part ?? content);
  const message = await saveMessage({
    ...rest,
    role: "assistant",
    content,
    externalId: result.externalId ?? undefined,
  });
  if (today) await incrementAgentMessageCount(rest.userId, today);
  return message;
}
