import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { findPracticePillState } from "@/src/services/practice-pill-service";

export async function GET(): Promise<Response> {
  try {
    const user = await requireAuth();
    return Response.json(await findPracticePillState(user.id));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[get/api/app/practice-state]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
