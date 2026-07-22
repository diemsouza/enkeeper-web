import { z, ZodError } from "zod";
import {
  findWaitlistByPhone,
  createWaitlistEntry,
  countWaitlistEntriesSince,
} from "@/src/repo/waitlist.repo";
import { sendWhatsAppMessage } from "@/src/vendors/whatsapp.vendor";

const WaitlistPayloadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\d+$/, "phone must contain digits only")
    .min(10)
    .max(15),
});

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const NOTIFY_WINDOW_MS = 5 * 60 * 1000;
const NOTIFY_MAX_PER_WINDOW = 3;

// Best-effort limiter, escopo de modulo. Reseta a cada cold start e nao e
// compartilhado entre instancias serverless, mas reduz o custo de uma rajada
// vinda da mesma instancia/IP sem depender de infra externa.
const ipRequestTimestamps = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (ipRequestTimestamps.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  timestamps.push(now);
  ipRequestTimestamps.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return Response.json({ error: "too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, phone } = WaitlistPayloadSchema.parse(body);

    const existing = await findWaitlistByPhone(phone);
    if (existing) {
      return Response.json({ success: true, already: true });
    }
    await createWaitlistEntry(name, phone);

    const waSupport = process.env.WA_SUPPORT;
    if (waSupport) {
      const recentCount = await countWaitlistEntriesSince(
        new Date(Date.now() - NOTIFY_WINDOW_MS),
      );
      if (recentCount <= NOTIFY_MAX_PER_WINDOW) {
        try {
          await sendWhatsAppMessage(
            waSupport,
            `Novo contato na lista de espera.\nNome: ${name}\nTelefone: +${phone}`,
          );
        } catch {
          // falha silenciosa
        }
      }
    }
    return Response.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
