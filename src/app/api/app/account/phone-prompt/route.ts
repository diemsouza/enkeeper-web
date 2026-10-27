import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { markUserPhonePrompted } from "@/src/repo/users.repo";

export async function POST(): Promise<Response> {
  try {
    const user = await requireAuth();
    await markUserPhonePrompted(user.id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[post/api/app/account/phone-prompt]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
