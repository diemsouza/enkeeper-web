import { after } from "next/server";
import { NextRequest } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { handleIncomingMessage } from "../../../../services/message-service";
import { sendMessage } from "../../../../services/whatsapp-service";
import { IncomingMessage } from "../../../../types/domain";
import {
  verifyMetaSignature,
  verifyWebhookToken,
} from "@/src/lib/whatsapp-verify";

async function resolveMediaUrl(mediaId: string): Promise<string> {
  const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WABA_TOKEN}` },
  });
  if (!res.ok)
    throw new Error(`Failed to resolve media ${mediaId}: ${res.status}`);
  const data = (await res.json()) as { url: string };
  return data.url;
}

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
      let input: IncomingMessage = {
        channelId: wa_id,
        channelType: "whatsapp",
        externalId: message.id,
      };

      if (message.type === "text" && message.text) {
        input = { ...input, text: message.text.body };
      } else if (message.type === "audio" && message.audio) {
        const audioUrl = await resolveMediaUrl(message.audio.id);
        input = { ...input, audioUrl };
      } else if (message.type === "image" && message.image) {
        const imageUrl = await resolveMediaUrl(message.image.id);
        input = { ...input, imageUrl };
      } else {
        return;
      }

      const reply = await handleIncomingMessage(input);
      await sendMessage(wa_id, reply);
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
        const input = body as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ id?: string }> } }> }> };
        const externalId = input?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id ?? "unknown";
        console.log(`[WEBHOOK] duplicate message ignored ${externalId}`);
        return;
      }
      console.error("[WA WEBHOOK] processing error", err);
    }
  });

  return new Response(null, { status: 200 });
}
