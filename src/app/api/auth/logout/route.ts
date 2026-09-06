import { clearSessionCookie } from "@/src/lib/auth/session-cookie";

export async function POST(): Promise<Response> {
  await clearSessionCookie();
  return Response.json({ ok: true });
}
