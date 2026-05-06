import { SEQUENCE_WA_MESSAGE_INTERVAL_SEG } from "../lib/constants";

type MediaDownloadResult = {
  buffer: Buffer;
  mimeType: string;
  fileSize?: number;
  sha256?: string;
};

export async function sendWhatsAppMessage(
  to: string,
  text: string,
): Promise<void> {
  const token = process.env.WABA_TOKEN;
  const phoneNumberId = process.env.WABA_PHONE_ID;

  if (process.env.SIMULATOR_MODE === "true") return;

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
        to,
        type: "text",
        text: { body: text },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Meta API error ${res.status}: ${detail}`);
  }
}

export async function sendWhatsAppMessages(
  to: string,
  texts: string[],
): Promise<void> {
  for (let i = 0; i < texts.length; i++) {
    if (i > 0)
      await new Promise((resolve) =>
        setTimeout(resolve, SEQUENCE_WA_MESSAGE_INTERVAL_SEG * 1000),
      );
    await sendWhatsAppMessage(to, texts[i]);
  }
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
