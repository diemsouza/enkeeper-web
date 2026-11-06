import { after } from "next/server";
import { ulid } from "ulid";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { CONTINUE_PRACTICE_BUTTON_ID } from "@/src/lib/constants";
import { handleIncomingMessage } from "@/src/services/message-service";
import { resolveChannel } from "@/src/lib/channels/resolve-channel";

export async function POST(): Promise<Response> {
  try {
    const user = await requireAuth();
    after(() =>
      handleIncomingMessage(
        {
          userId: user.id,
          text: "Continuar",
          externalId: ulid(),
          buttonId: CONTINUE_PRACTICE_BUTTON_ID,
          receivedAt: new Date(),
        },
        resolveChannel(),
      ),
    );
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[post/api/app/practice/continue]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
