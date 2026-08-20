import type { OutMessage } from "../../types/out-message";
import type {
  ChannelSendResult,
  MessageChannel,
  NudgeTemplate,
} from "../../types/message-channel";
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  uploadWhatsAppMedia,
  sendWhatsAppAudio,
  sendWhatsAppInteractiveButtons,
} from "../../vendors/whatsapp.vendor";
import { downloadFile } from "../../vendors/storage.vendor";
import { TTS_MIME_TYPE } from "../../vendors/tts.vendor";

async function sendAudioPart(
  to: string,
  part: { audioPath: string },
): Promise<string | null> {
  try {
    const buffer = await downloadFile({ filePath: part.audioPath });
    const mediaId = await uploadWhatsAppMedia(buffer, TTS_MIME_TYPE);
    return await sendWhatsAppAudio(to, mediaId);
  } catch (err) {
    console.error("[WhatsAppChannel] audio delivery failed:", err);
    return null;
  }
}

export class WhatsAppChannel implements MessageChannel {
  async sendMessage(to: string, message: OutMessage): Promise<ChannelSendResult> {
    let externalId: string | null;
    if (typeof message === "string") {
      externalId = await sendWhatsAppMessage(to, message);
    } else if ("audioPath" in message) {
      externalId = await sendAudioPart(to, message);
    } else {
      externalId = await sendWhatsAppInteractiveButtons(
        to,
        message.content,
        message.buttons,
      );
    }
    return { externalId };
  }

  async sendTemplate(to: string, template: NudgeTemplate): Promise<ChannelSendResult> {
    return { externalId: await sendWhatsAppTemplate(to, template) };
  }
}
