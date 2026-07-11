import { DEFAULT_MESSAGE_INTERVAL_SEC } from "../constants";
import type { OutMessage } from "../../types/out-message";
import type { MessageChannel, NudgeTemplate } from "../../types/message-channel";
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
} from "../../vendors/whatsapp.vendor";

export class WhatsAppChannel implements MessageChannel {
  async sendMessage(to: string, messages: OutMessage | OutMessage[]): Promise<void> {
    const parts = Array.isArray(messages) ? messages : [messages];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (typeof part === "object") {
        await new Promise((resolve) => setTimeout(resolve, part.delay * 1000));
        continue;
      }
      if (i > 0 && typeof parts[i - 1] === "string") {
        await new Promise((resolve) =>
          setTimeout(resolve, DEFAULT_MESSAGE_INTERVAL_SEC * 1000),
        );
      }
      await sendWhatsAppMessage(to, part);
    }
  }

  async sendTemplate(to: string, template: NudgeTemplate): Promise<void> {
    await sendWhatsAppTemplate(to, template);
  }
}
