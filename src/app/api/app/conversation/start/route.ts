import { after } from "next/server";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { findUserChannelByUserId } from "@/src/repo/users.repo";
import { startConversationIfNeeded } from "@/src/services/message-service";
import { resolveChannel } from "@/src/lib/channels/resolve-channel";

export async function POST(): Promise<Response> {
  try {
    const user = await requireAuth();
    const userChannel = await findUserChannelByUserId(user.id);
    if (!userChannel) {
      return Response.json({ error: "channel not found" }, { status: 409 });
    }

    after(async () => {
      try {
        await startConversationIfNeeded(user, userChannel, resolveChannel());
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
