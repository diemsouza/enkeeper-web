import { z, ZodError } from "zod";
import { verifyWaLoginToken } from "@/src/core/wa-login-token";
import { findUserByIdentifier } from "@/src/repo/users.repo";
import { setSessionCookie } from "@/src/lib/auth/session-cookie";

const WaLoginSchema = z.object({
  waToken: z.string().trim().min(1),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { waToken } = WaLoginSchema.parse(body);

    const payload = await verifyWaLoginToken(waToken);
    if (!payload) return Response.json({ ok: false });

    const user = await findUserByIdentifier("web", payload.phone);
    if (!user) return Response.json({ ok: false });

    await setSessionCookie(user.id);
    return Response.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof ZodError) return Response.json({ ok: false });
    console.error("[post/api/auth/wa-login]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
