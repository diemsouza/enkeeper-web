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
    const externalId =
      typeof message === "object"
        ? await sendAudioPart(to, message)
        : await sendWhatsAppMessage(to, message);
    return { externalId };
  }

  async sendTemplate(to: string, template: NudgeTemplate): Promise<ChannelSendResult> {
    return { externalId: await sendWhatsAppTemplate(to, template) };
  }
}
