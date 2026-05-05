import { after } from "next/server";
import { NextRequest } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { handleIncomingMessage } from "../../../../services/message-service";
import { findOrCreateUserByChannel } from "../../../../services/user-service";
import {
  downloadMedia,
  sendWhatsAppMessage,
} from "../../../../vendors/whatsapp.vendor";
import { transcribeAudio } from "../../../../vendors/whisper.vendor";
import { extractTextFromImage, extractTextFromPdf } from "../../../../vendors/llm.vendor";
import { canUseAudio, canUseImage } from "../../../../core/limits";
import { formatUpgradePrompt, formatImageNoText } from "../../../../core/formatters";
import { IncomingMessage } from "../../../../types/domain";
import {
  verifyMetaSignature,
  verifyWebhookToken,
} from "@/src/lib/whatsapp-verify";

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const challenge = verifyWebhookToken(searchParams);

  if (!challenge) return new Response(null, { status: 403 });
  return new Response(challenge, { status: 200 });
}

export async function POST(req: NextRequest): Promise<Response> {
  const { valid, rawBody } = await verifyMetaSignature(req);
  if (!valid) return new Response(null, { status: 403 });

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response(null, { status: 200 });
  }

  //console.log("[WA WEBHOOK] received payload", body);

  after(async () => {
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
              }>;
              contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
            };
          }>;
        }>;
      };

      const value = payload?.entry?.[0]?.changes?.[0]?.value;
      if (!value?.messages?.length) return;

      const wa_id = value.contacts?.[0]?.wa_id;
      if (!wa_id) return;

      const contactName = value.contacts?.[0]?.profile?.name;
      const message = value.messages[0];
      const base: IncomingMessage = {
        channelId: wa_id,
        channelType: "whatsapp",
        externalId: message.id,
        contactName,
      };

      if (message.type === "audio" && message.audio) {
        const isVoiceNote = message.audio.voice === true;

        if (!isVoiceNote) {
          const user = await findOrCreateUserByChannel("whatsapp", wa_id);
          if (!canUseAudio(user)) {
            await sendWhatsAppMessage(wa_id, formatUpgradePrompt("audio"));
            return;
          }
        }

        const { buffer, mimeType, fileSize } = await downloadMedia(message.audio.id);
        const { text: transcription, duration, format } = await transcribeAudio(buffer, mimeType);

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

        const replies = await handleIncomingMessage(input);
        for (const r of replies) await sendWhatsAppMessage(wa_id, r);
        return;
      }

      if (message.type === "image" && message.image) {
        const user = await findOrCreateUserByChannel("whatsapp", wa_id);
        if (!canUseImage(user)) {
          await sendWhatsAppMessage(wa_id, formatUpgradePrompt("image"));
          return;
        }
        const { buffer, mimeType, fileSize } = await downloadMedia(message.image.id);
        const visionResult = await extractTextFromImage(buffer, user.id);

        if (visionResult.transcription_type === "description") {
          await sendWhatsAppMessage(wa_id, formatImageNoText());
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
        const replies = await handleIncomingMessage(input);
        for (const r of replies) await sendWhatsAppMessage(wa_id, r);
        return;
      }

      const TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown", "application/octet-stream"]);

      if (
        message.type === "document" &&
        message.document &&
        TEXT_MIME_TYPES.has(message.document.mime_type ?? "")
      ) {
        const { buffer } = await downloadMedia(message.document.id);
        const input: IncomingMessage = {
          ...base,
          text: buffer.toString("utf-8"),
          mediaType: "text",
          mediaId: message.document.id,
          mediaMetadata: { media_type: "text" },
        };
        const replies = await handleIncomingMessage(input);
        for (const r of replies) await sendWhatsAppMessage(wa_id, r);
        return;
      }

      if (
        message.type === "document" &&
        message.document &&
        message.document.mime_type === "application/pdf"
      ) {
        const { buffer, fileSize } = await downloadMedia(message.document.id);
        const text = await extractTextFromPdf(buffer);
        const input: IncomingMessage = {
          ...base,
          text,
          mediaType: "pdf",
          mediaId: message.document.id,
          mediaMetadata: { media_type: "pdf", size_bytes: fileSize ?? null },
        };
        const replies = await handleIncomingMessage(input);
        for (const r of replies) await sendWhatsAppMessage(wa_id, r);
        return;
      }

      let input: IncomingMessage = base;
      if (message.type === "text" && message.text) {
        input = { ...base, text: message.text.body };
      } else {
        return;
      }

      const replies = await handleIncomingMessage(input);
      for (const r of replies) await sendWhatsAppMessage(wa_id, r);
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
        const raw = body as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ id?: string }> } }> }> };
        const externalId = raw?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ?? "unknown";
        console.log(`[WEBHOOK] duplicate message ignored ${externalId}`);
        return;
      }
      console.error("[WA WEBHOOK] processing error", err);
    }
  });

  return new Response(null, { status: 200 });
}
