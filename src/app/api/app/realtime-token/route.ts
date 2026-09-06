import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { signRealtimeToken } from "@/src/core/realtime-token";

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth();
    const token = await signRealtimeToken(user.id);
    return Response.json({ token });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[get/api/app/realtime-token]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
