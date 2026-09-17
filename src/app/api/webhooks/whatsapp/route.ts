import { after } from "next/server";
import { NextRequest } from "next/server";
import {
  formatGenericError,
  formatWhatsAppRedirect,
} from "../../../../core/formatters";
import { processWhatsAppStatusEvent } from "../../../../services/message-status-service";
import {
  verifyMetaSignature,
  verifyWebhookToken,
} from "@/src/lib/whatsapp-verify";
import { WhatsAppChannel } from "../../../../lib/channels/whatsapp-channel";
import { buildWaLoginUrl } from "../../../../services/wa-login-link-service";
import { normalizePhoneToWaId } from "../../../../core/phone";

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

  after(async () => {
    const channel = new WhatsAppChannel();
    let wa_id: string | undefined;
    let channelId: string | undefined;
    try {
      const payload = body as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: Array<{ id: string }>;
              contacts?: Array<{ wa_id?: string; user_id?: string }>;
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
      channelId = user_id ?? wa_id;
      if (!channelId) {
        console.log(
          "[post/api/webhooks/whatsapp] no user_id or wa_id in payload, skipping",
        );
        return;
      }

      // Canal WhatsApp não roda mais nenhum pipeline de produto (prática,
      // comando, onboarding, doc/OCR/transcrição) — qualquer mensagem
      // recebida, de qualquer tipo, gera só essa resposta fixa redirecionando
      // pro app web, sem gravar em Message (mesmo princípio já aplicado a
      // Notification).
      const normalizedPhone = wa_id ? normalizePhoneToWaId(wa_id) : null;
      if (!normalizedPhone) {
        console.warn(
          "[post/api/webhooks/whatsapp] could not normalize wa_id, sending fallback reply",
          { wa_id },
        );
        await channel.sendMessage(channelId, formatGenericError());
        return;
      }

      const url = await buildWaLoginUrl(normalizedPhone, "/login");
      await channel.sendMessage(channelId, formatWhatsAppRedirect(url));
    } catch (err) {
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
