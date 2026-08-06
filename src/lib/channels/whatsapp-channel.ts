import { DEFAULT_MESSAGE_INTERVAL_SEC } from "../constants";
import type { OutMessage } from "../../types/out-message";
import type { MessageChannel, NudgeTemplate } from "../../types/message-channel";
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  uploadWhatsAppMedia,
  sendWhatsAppAudio,
} from "../../vendors/whatsapp.vendor";
import { downloadFile } from "../../vendors/storage.vendor";
import { TTS_MIME_TYPE } from "../../vendors/tts.vendor";

async function sendAudioPart(
  to: string,
  part: { audioPath: string; textFallback: string },
): Promise<void> {
  try {
    const buffer = await downloadFile({ filePath: part.audioPath });
    const mediaId = await uploadWhatsAppMedia(buffer, TTS_MIME_TYPE);
    await sendWhatsAppAudio(to, mediaId);
  } catch (err) {
    console.error(
      "[WhatsAppChannel] audio delivery failed, falling back to text:",
      err,
    );
    await sendWhatsAppMessage(to, part.textFallback);
  }
}

export class WhatsAppChannel implements MessageChannel {
  async sendMessage(to: string, messages: OutMessage | OutMessage[]): Promise<void> {
    const parts = Array.isArray(messages) ? messages : [messages];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (typeof part === "object") {
        if ("delay" in part) {
          await new Promise((resolve) => setTimeout(resolve, part.delay * 1000));
        } else {
          await sendAudioPart(to, part);
        }
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
