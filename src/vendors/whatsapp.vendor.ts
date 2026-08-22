import { ExternalMessageStatus } from "../lib/prisma";

type WhatsAppInteractiveButton = { id: string; title: string };

type MediaDownloadResult = {
  buffer: Buffer;
  mimeType: string;
  fileSize?: number;
  sha256?: string;
};

const BSUID_FORMAT = /^[A-Z]{2}\.[A-Za-z0-9]+$/;

function isBsuidFormat(value: string): boolean {
  return BSUID_FORMAT.test(value);
}

function buildRecipientField(
  to: string,
): { recipient: string } | { to: string } {
  return isBsuidFormat(to) ? { recipient: to } : { to };
}

export function mapWhatsAppStatus(
  rawStatus: string,
): ExternalMessageStatus | null {
  switch (rawStatus) {
    case "sent":
      return ExternalMessageStatus.sent;
    case "delivered":
      return ExternalMessageStatus.delivered;
    case "read":
      return ExternalMessageStatus.read;
    case "failed":
      return ExternalMessageStatus.failed;
    default:
      return null;
  }
}

export async function sendWhatsAppMessage(
  to: string,
  text: string,
): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[sendWhatsAppMessage] Skipping sending message to ${to} in non-production environment`,
    );
    return null;
  }

  const token = process.env.WABA_TOKEN;
  const phoneNumberId = process.env.WABA_PHONE_ID;

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...buildRecipientField(to),
        type: "text",
        text: { body: text },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Meta API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { messages?: { id: string }[] };
  return data.messages?.[0]?.id ?? null;
}

export async function sendWhatsAppInteractiveButtons(
  to: string,
  body: string,
  buttons: WhatsAppInteractiveButton[],
): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[sendWhatsAppInteractiveButtons] Skipping sending message to ${to} in non-production environment`,
    );
    return null;
  }

  const token = process.env.WABA_TOKEN;
  const phoneNumberId = process.env.WABA_PHONE_ID;

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...buildRecipientField(to),
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: {
            buttons: buttons.map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Meta API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { messages?: { id: string }[] };
  return data.messages?.[0]?.id ?? null;
}

export async function sendWhatsAppCtaUrl(
  to: string,
  body: string,
  url: string,
  buttonLabel: string,
): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[sendWhatsAppCtaUrl] Skipping sending message to ${to} in non-production environment`,
    );
    return null;
  }

  const token = process.env.WABA_TOKEN;
  const phoneNumberId = process.env.WABA_PHONE_ID;

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...buildRecipientField(to),
        type: "interactive",
        interactive: {
          type: "cta_url",
          body: { text: body },
          action: {
            name: "cta_url",
            parameters: { display_text: buttonLabel, url },
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Meta API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { messages?: { id: string }[] };
  return data.messages?.[0]?.id ?? null;
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[sendWhatsAppTemplate] Skipping sending template ${templateName} to ${to} in non-production environment`,
    );
    return null;
  }

  const token = process.env.WABA_TOKEN;
  const phoneNumberId = process.env.WABA_PHONE_ID;

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...buildRecipientField(to),
        type: "template",
        template: {
          name: templateName,
          language: { code: "pt_BR" },
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Meta template API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { messages?: { id: string }[] };
  return data.messages?.[0]?.id ?? null;
}

export async function uploadWhatsAppMedia(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[uploadWhatsAppMedia] Skipping media upload in non-production environment`,
    );
    return "";
  }

  const token = process.env.WABA_TOKEN;
  const phoneNumberId = process.env.WABA_PHONE_ID;
  const ext = mimeType.split("/")[1]?.split(";")[0] ?? "ogg";

  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    `audio.${ext}`,
  );
  formData.append("type", mimeType);

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Meta media upload error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function sendWhatsAppAudio(
  to: string,
  mediaId: string,
): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[sendWhatsAppAudio] Skipping sending audio to ${to} in non-production environment`,
    );
    return null; // mediaId vem "" aqui pois uploadWhatsAppMedia tambem faz no-op; os dois guards tem que ficar sincronizados
  }

  const token = process.env.WABA_TOKEN;
  const phoneNumberId = process.env.WABA_PHONE_ID;

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...buildRecipientField(to),
        type: "audio",
        audio: { id: mediaId, voice: true },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Meta audio send error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as { messages?: { id: string }[] };
  return data.messages?.[0]?.id ?? null;
}

export async function downloadMedia(
  mediaId: string,
): Promise<MediaDownloadResult> {
  const token = process.env.WABA_TOKEN;

  const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) {
    throw new Error(
      `Failed to fetch media metadata ${mediaId}: ${metaRes.status}`,
    );
  }

  const meta = (await metaRes.json()) as {
    url: string;
    mime_type: string;
    file_size?: number;
    sha256?: string;
  };

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!fileRes.ok) {
    throw new Error(`Failed to download media ${mediaId}: ${fileRes.status}`);
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: meta.mime_type,
    fileSize: meta.file_size,
    sha256: meta.sha256,
  };
}

export async function resolveMediaUrl(mediaId: string): Promise<string> {
  const token = process.env.WABA_TOKEN;
  const res = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to resolve media ${mediaId}: ${res.status}`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}
