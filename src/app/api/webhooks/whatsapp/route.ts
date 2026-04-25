import { after } from "next/server";
import { NextRequest } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { handleIncomingMessage } from "../../../../services/message-service";
import { findOrCreateUserByChannel } from "../../../../services/user-service";
import {
  downloadMedia,
  resolveMediaUrl,
  sendWhatsAppMessage,
} from "../../../../vendors/whatsapp.vendor";
import { transcribeAudio } from "../../../../vendors/whisper.vendor";
import { canUseAudio } from "../../../../core/limits";
import { formatUpgradePrompt } from "../../../../core/formatters";
import { IncomingMessage, PlanCode } from "../../../../types/domain";
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
                audio?: { id: string };
                image?: { id: string };
              }>;
              contacts?: Array<{ wa_id: string }>;
            };
          }>;
        }>;
      };

      const value = payload?.entry?.[0]?.changes?.[0]?.value;
      if (!value?.messages?.length) return;

      const wa_id = value.contacts?.[0]?.wa_id;
      if (!wa_id) return;

      const message = value.messages[0];
      const base: IncomingMessage = {
        channelId: wa_id,
        channelType: "whatsapp",
        externalId: message.id,
      };

      if (message.type === "audio" && message.audio) {
        const user = await findOrCreateUserByChannel("whatsapp", wa_id);
        if (!canUseAudio(user.planCode as PlanCode)) {
          await sendWhatsAppMessage(wa_id, formatUpgradePrompt("audio"));
          return;
        }
        const { buffer, mimeType, fileSize, sha256 } = await downloadMedia(message.audio.id);
        const transcription = await transcribeAudio(buffer, mimeType);
        const input: IncomingMessage = {
          ...base,
          text: transcription,
          mediaType: "audio",
          mediaId: message.audio.id,
          mediaMetadata: {
            mimeType,
            fileSize: fileSize ?? null,
            sha256: sha256 ?? null,
            mediaId: message.audio.id,
          },
        };
        const reply = await handleIncomingMessage(input);
        await sendWhatsAppMessage(wa_id, reply);
        return;
      }

      let input: IncomingMessage = base;
      if (message.type === "text" && message.text) {
        input = { ...base, text: message.text.body };
      } else if (message.type === "image" && message.image) {
        const imageUrl = await resolveMediaUrl(message.image.id);
        input = { ...base, imageUrl };
      } else {
        return;
      }

      const reply = await handleIncomingMessage(input);
      await sendWhatsAppMessage(wa_id, reply);
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
