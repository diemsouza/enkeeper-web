import type { OutMessage } from "./out-message";

export type NudgeTemplate = string;

export interface MessageChannel {
  sendMessage(to: string, messages: OutMessage | OutMessage[]): Promise<void>;
  sendTemplate(to: string, template: NudgeTemplate): Promise<void>;
}
