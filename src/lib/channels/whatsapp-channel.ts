import type { FormattedMessage } from "../../types/out-message";
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
  sendWhatsAppCtaUrl,
} from "../../vendors/whatsapp.vendor";
import { downloadFile } from "../../vendors/storage.vendor";
import { TTS_MIME_TYPE } from "../../vendors/tts.vendor";

async function sendAudioPart(
  to: string,
  audioPath: string,
): Promise<string | null> {
  try {
    const buffer = await downloadFile({ filePath: audioPath });
    const mediaId = await uploadWhatsAppMedia(buffer, TTS_MIME_TYPE);
    return await sendWhatsAppAudio(to, mediaId);
  } catch (err) {
    console.error("[WhatsAppChannel] audio delivery failed:", err);
    return null;
  }
}

export class WhatsAppChannel implements MessageChannel {
  async sendMessage(to: string, message: FormattedMessage): Promise<ChannelSendResult> {
    if (message.audioPath) {
      return { externalId: await sendAudioPart(to, message.audioPath) };
    }
    if (message.templateName) {
      return this.sendTemplate(to, message.templateName);
    }
    if (message.interactive) {
      const linkButton = message.interactive.buttons.find(
        (b) => b.type === "link",
      );
      if (linkButton?.url) {
        return {
          externalId: await sendWhatsAppCtaUrl(
            to,
            message.interactive.body,
            linkButton.url,
            linkButton.label,
          ),
        };
      }
      const buttons = message.interactive.buttons.map((b) => ({
        id: b.id,
        title: b.label,
      }));
      return {
        externalId: await sendWhatsAppInteractiveButtons(
          to,
          message.interactive.body,
          buttons,
        ),
      };
    }
    return { externalId: await sendWhatsAppMessage(to, message.text) };
  }

  async sendTemplate(to: string, template: NudgeTemplate): Promise<ChannelSendResult> {
    return { externalId: await sendWhatsAppTemplate(to, template) };
  }
}
