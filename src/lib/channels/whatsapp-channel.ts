import type { FormattedMessage } from "../../types/out-message";
import type {
  ChannelSendResult,
  MessageChannel,
  NudgeTemplate,
  TypingContext,
} from "../../types/message-channel";
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
  uploadWhatsAppMedia,
  sendWhatsAppAudio,
  sendWhatsAppImage,
  sendWhatsAppInteractiveButtons,
  sendWhatsAppCtaUrl,
  sendWhatsAppTypingIndicator,
} from "../../vendors/whatsapp.vendor";
import { downloadFile } from "../../vendors/storage.vendor";
import { getMediaById } from "../../repo/media.repo";
import {
  formatCaptureStepOptionsText,
  formatNumberedOptions,
} from "../../core/formatters";
import { PICK_SHORTCUTS } from "../constants";

async function downloadMedia(
  mediaId: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const media = await getMediaById(mediaId);
  if (!media) throw new Error(`media ${mediaId} not found`);
  const buffer = await downloadFile({ filePath: media.mediaPath });
  return { buffer, contentType: media.contentType };
}

async function sendAudioPart(
  to: string,
  audioMediaId: string,
): Promise<string | null> {
  try {
    const { buffer, contentType } = await downloadMedia(audioMediaId);
    const mediaId = await uploadWhatsAppMedia(buffer, contentType);
    return await sendWhatsAppAudio(to, mediaId);
  } catch (err) {
    console.error("[WhatsAppChannel] audio delivery failed:", err);
    return null;
  }
}

async function sendImagePart(
  to: string,
  imageMediaId: string,
  caption: string,
): Promise<string | null> {
  try {
    const { buffer, contentType } = await downloadMedia(imageMediaId);
    const mediaId = await uploadWhatsAppMedia(buffer, contentType);
    return await sendWhatsAppImage(to, mediaId, caption);
  } catch (err) {
    console.error("[WhatsAppChannel] image delivery failed:", err);
    return null;
  }
}

const MAX_NATIVE_REPLY_BUTTONS = 3;

function resolveText(message: FormattedMessage): string {
  if (!message.interactive?.isOptionList) return message.text;
  const options = message.interactive.buttons.map((b) => b.label);
  return formatNumberedOptions(message.text, options);
}

type Interactive = NonNullable<FormattedMessage["interactive"]>;

async function sendCaptureStep(
  to: string,
  interactive: Interactive,
): Promise<string | null> {
  const { body, buttons } = interactive;
  if (buttons.length <= MAX_NATIVE_REPLY_BUTTONS) {
    return sendWhatsAppInteractiveButtons(
      to,
      body,
      buttons.map((b) => ({ id: b.id, title: b.label })),
    );
  }
  return sendWhatsAppInteractiveButtons(
    to,
    formatCaptureStepOptionsText(
      body,
      buttons.map((b) => b.label),
    ),
    [PICK_SHORTCUTS.FIRST_OPTION, PICK_SHORTCUTS.RANDOM].map((b) => ({
      id: b.id,
      title: b.label,
    })),
  );
}

export class WhatsAppChannel implements MessageChannel {
  async sendMessage(to: string, message: FormattedMessage): Promise<ChannelSendResult> {
    const text = resolveText(message);
    if (message.imageMediaId) {
      return {
        externalId: await sendImagePart(to, message.imageMediaId, text),
      };
    }
    if (message.audioMediaId) {
      return { externalId: await sendAudioPart(to, message.audioMediaId) };
    }
    if (message.templateName) {
      return this.sendTemplate(
        to,
        message.templateName,
        message.templateBodyParams,
        message.templateButtonUrlParam,
      );
    }
    if (message.interactive?.isOptionList && message.interactive.isCaptureStep) {
      return { externalId: await sendCaptureStep(to, message.interactive) };
    }
    if (message.interactive && !message.interactive.isOptionList) {
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
    return { externalId: await sendWhatsAppMessage(to, text) };
  }

  async sendTemplate(
    to: string,
    template: NudgeTemplate,
    bodyParams?: string[],
    buttonUrlParam?: string,
  ): Promise<ChannelSendResult> {
    return {
      externalId: await sendWhatsAppTemplate(to, template, bodyParams, buttonUrlParam),
    };
  }

  async notifyTyping(_userId: string, ctx?: TypingContext): Promise<void> {
    if (!ctx?.replyToMessageId) return;
    try {
      await sendWhatsAppTypingIndicator(ctx.replyToMessageId);
    } catch (err) {
      console.error("[WhatsAppChannel] typing indicator failed:", err);
    }
  }

  // Cloud API nao tem stop: o indicador some na proxima resposta ou em 25s.
  async notifyTypingStop(_userId: string): Promise<void> {}
}
