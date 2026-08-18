import { after } from "next/server";
import { NextRequest } from "next/server";
import { Prisma } from "../../../../lib/prisma";
import { handleIncomingMessage } from "../../../../services/message-service";
import { findOrCreateUserByChannel } from "../../../../services/user-service";
import { downloadMedia } from "../../../../vendors/whatsapp.vendor";
import { transcribeAudio } from "../../../../vendors/whisper.vendor";
import {
  extractTextFromImage,
  extractTextFromPdf,
} from "../../../../vendors/llm.vendor";
import { canUseAudio, canUseImage } from "../../../../core/limits";
import { canPractice } from "../../../../core/access";
import {
  formatUpgradePrompt,
  formatImageNoText,
  formatPlanExpired,
  formatGenericError,
  formatUnsupportedFileType,
  formatVideoUnsupported,
  formatInvalidMessageType,
} from "../../../../core/formatters";
import { IncomingMessage } from "../../../../types/domain";
import { processWhatsAppStatusEvent } from "../../../../services/message-status-service";
import {
  verifyMetaSignature,
  verifyWebhookToken,
} from "@/src/lib/whatsapp-verify";
import { WhatsAppChannel } from "../../../../lib/channels/whatsapp-channel";

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const challenge = verifyWebhookToken(searchParams);

  if (!challenge) return new Response(null, { status: 403 });
  return new Response(challenge, { status: 200 });
}

export async function POST(req: NextRequest): Promise<Response> {
  const receivedAt = new Date();
  const { valid, rawBody } = await verifyMetaSignature(req);
  if (!valid) return new Response(null, { status: 403 });

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 200 });
  }

  //console.log("[post/api/webhooks/whatsapp] received payload", body);

  after(async () => {
    const channel = new WhatsAppChannel();
    let wa_id: string | undefined;
    let channelId: string | undefined;
    try {
      const payload = body as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: Array<{
                id: string;
                type: string;
                text?: { body: string };
                audio?: { id: string; voice?: boolean };
                image?: { id: string };
                document?: { id: string; mime_type?: string };
                button?: { text: string; payload?: string };
                interactive?: {
                  type: string;
                  button_reply?: { id: string; title: string };
                  list_reply?: { id: string; title: string };
                };
              }>;
              contacts?: Array<{
                wa_id?: string;
                user_id?: string;
                username?: string;
                profile?: { name?: string };
              }>;
              statuses?: Array<{
                id: string;
                status: string;
                timestamp?: string;
              }>;
            };
          }>;
        }>;
      };

      const value = payload?.entry?.[0]?.changes?.[0]?.value;

      if (value?.statuses?.length) {
        for (const status of value.statuses) {
          try {
            const timestamp = status.timestamp
              ? new Date(Number(status.timestamp) * 1000)
              : undefined;
            await processWhatsAppStatusEvent(
              status.status,
              status.id,
              timestamp,
            );
          } catch (err) {
            console.error(
              "[post/api/webhooks/whatsapp] failed to process status event",
              err,
            );
          }
        }
        return;
      }

      if (!value?.messages?.length) {
        console.log(
          "[post/api/webhooks/whatsapp] no messages in payload, skipping",
        );
        return;
      }

      wa_id = value.contacts?.[0]?.wa_id;
      const user_id = value.contacts?.[0]?.user_id;
      const username = value.contacts?.[0]?.username;
      channelId = user_id ?? wa_id;
      if (!channelId) {
        console.log(
          "[post/api/webhooks/whatsapp] no user_id or wa_id in payload, skipping",
        );
        return;
      }

      const contactName = value.contacts?.[0]?.profile?.name;
      const message = value.messages[0];
      const base: IncomingMessage = {
        channelUserId: channelId,
        channelUserPhone: wa_id,
        channelUsername: username,
        channelType: "whatsapp",
        externalId: message.id,
        contactName,
        receivedAt,
      };

      if (message.type === "audio" && message.audio) {
        const isVoiceNote = message.audio.voice === true;

        if (!isVoiceNote) {
          const { user } = await findOrCreateUserByChannel(
            "whatsapp",
            channelId,
            wa_id,
            username,
          );
          if (!canUseAudio(user)) {
            await channel.sendMessage(channelId, formatUpgradePrompt("audio"));
            return;
          }
        }

        const { buffer, mimeType, fileSize } = await downloadMedia(
          message.audio.id,
        );
        const {
          text: transcription,
          duration,
          format,
        } = await transcribeAudio(buffer, mimeType);

        const input: IncomingMessage = isVoiceNote
          ? { ...base, text: transcription }
          : {
              ...base,
              text: transcription,
              mediaType: "audio",
              mediaId: message.audio.id,
              mediaMetadata: {
                media_type: "audio",
                size_bytes: fileSize ?? null,
                duration: duration ?? null,
                format,
              },
            };

        await handleIncomingMessage(input, channel);
        return;
      }

      if (message.type === "image" && message.image) {
        const { user } = await findOrCreateUserByChannel(
          "whatsapp",
          channelId,
          wa_id,
          username,
        );
        if (!canUseImage(user)) {
          await channel.sendMessage(channelId, formatUpgradePrompt("image"));
          return;
        }
        const { buffer, mimeType, fileSize } = await downloadMedia(
          message.image.id,
        );
        const visionResult = await extractTextFromImage(buffer, user.id);

        if (visionResult.transcription_type === "description") {
          await channel.sendMessage(channelId, formatImageNoText());
          return;
        }

        const format = mimeType.split("/")[1]?.split(";")[0] ?? "jpeg";
        const input: IncomingMessage = {
          ...base,
          text: visionResult.content,
          mediaType: "image",
          mediaId: message.image.id,
          mediaMetadata: {
            media_type: "image",
            transcription_type: visionResult.transcription_type,
            size_bytes: fileSize ?? null,
            format,
          },
        };
        await handleIncomingMessage(input, channel);
        return;
      }

      const TEXT_MIME_TYPES = new Set(["application/octet-stream"]);

      if (message.type === "document" && message.document) {
        const { user: docUser } = await findOrCreateUserByChannel(
          "whatsapp",
          channelId,
          wa_id,
          username,
        );
        if (!canPractice(docUser)) {
          await channel.sendMessage(channelId, formatPlanExpired());
          return;
        }

        const mime = message.document.mime_type ?? "";
        console.log("[post/api/webhooks/whatsapp] document received", {
          mime,
          messageId: message.id,
        });

        if (TEXT_MIME_TYPES.has(mime) || mime.startsWith("text/")) {
          const { buffer } = await downloadMedia(message.document.id);
          const input: IncomingMessage = {
            ...base,
            text: buffer.toString("utf-8"),
            mediaType: "text",
            mediaId: message.document.id,
            mediaMetadata: { media_type: "text" },
          };
          await handleIncomingMessage(input, channel);
          return;
        }

        if (mime === "application/pdf") {
          const { buffer, fileSize } = await downloadMedia(message.document.id);
          const text = await extractTextFromPdf(buffer);
          const input: IncomingMessage = {
            ...base,
            text,
            mediaType: "pdf",
            mediaId: message.document.id,
            mediaMetadata: { media_type: "pdf", size_bytes: fileSize ?? null },
          };
          await handleIncomingMessage(input, channel);
          return;
        }

        console.warn(
          "[post/api/webhooks/whatsapp] unsupported document mime_type, ignoring",
          {
            mime,
            messageId: message.id,
          },
        );
        await channel.sendMessage(channelId, formatUnsupportedFileType());
        return;
      }

      let input: IncomingMessage = base;
      if (message.type === "text" && message.text) {
        input = { ...base, text: message.text.body };
      } else if (message.type === "button" && message.button) {
        input = { ...base, text: message.button.text };
      } else if (message.type === "interactive" && message.interactive) {
        const title =
          message.interactive.button_reply?.title ??
          message.interactive.list_reply?.title;
        if (!title) {
          console.log(
            "[post/api/webhooks/whatsapp] interactive message without title, ignoring",
            { messageId: message.id },
          );
          await channel.sendMessage(channelId, formatUnsupportedFileType());
          return;
        }
        input = { ...base, text: title };
      } else if (message.type === "reaction" || message.type === "sticker") {
        console.log(
          "[post/api/webhooks/whatsapp] reaction/sticker received, ignoring",
          { type: message.type, messageId: message.id },
        );
        return;
      } else if (message.type === "video") {
        console.log(
          "[post/api/webhooks/whatsapp] video message received, unsupported",
          { messageId: message.id },
        );
        await channel.sendMessage(channelId, formatVideoUnsupported());
        return;
      } else {
        console.log(
          "[post/api/webhooks/whatsapp] unsupported message type, ignoring",
          { type: message.type, messageId: message.id },
        );
        await channel.sendMessage(channelId, formatInvalidMessageType());
        return;
      }

      await handleIncomingMessage(input, channel);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const raw = body as {
          entry?: Array<{
            changes?: Array<{ value?: { messages?: Array<{ id?: string }> } }>;
          }>;
        };
        const externalId =
          raw?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ?? "unknown";
        console.log(`[WEBHOOK] duplicate message ignored ${externalId}`);
        return;
      }
      console.error("[post/api/webhooks/whatsapp] processing error", err);
      if (channelId) {
        try {
          await channel.sendMessage(channelId, formatGenericError());
        } catch (fallbackError) {
          console.error(
            "[post/api/webhooks/whatsapp] failed to send generic error fallback",
            fallbackError,
          );
        }
      }
    }
  });

  return new Response(null, { status: 200 });
}
