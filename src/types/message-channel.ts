import type { OutMessage } from "./out-message";

export type NudgeTemplate = string;

export type ChannelSendResult = {
  externalId: string | null;
};

export interface MessageChannel {
  sendMessage(to: string, message: OutMessage): Promise<ChannelSendResult>;
  sendTemplate(to: string, template: NudgeTemplate): Promise<ChannelSendResult>;
}
