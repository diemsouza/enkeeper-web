import { createHmac } from "crypto";

export function verifyWebhookToken(
  searchParams: URLSearchParams,
): string | null {
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}

export async function verifyMetaSignature(
  req: Request,
): Promise<{ valid: boolean; rawBody: string }> {
  const signature = req.headers.get("x-hub-signature-256");
  const rawBody = await req.text();

  if (!signature) return { valid: false, rawBody };

  const expected =
    "sha256=" +
    createHmac("sha256", process.env.WHATSAPP_APP_SECRET!)
      .update(rawBody)
      .digest("hex");

  return { valid: signature === expected, rawBody };
}
