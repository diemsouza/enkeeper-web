import { after } from "next/server";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { startConversationIfNeeded } from "@/src/services/message-service";
import { resolveChannel } from "@/src/lib/channels/resolve-channel";

export async function POST(): Promise<Response> {
  try {
    const user = await requireAuth();

    after(async () => {
      try {
        await startConversationIfNeeded(user, resolveChannel());
      } catch (error) {
        console.error("[post/api/app/conversation/start] after", error);
      }
    });

    return Response.json({ started: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[post/api/app/conversation/start]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
