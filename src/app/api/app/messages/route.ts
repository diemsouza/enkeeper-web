import { after } from "next/server";
import { ulid } from "ulid";
import { z, ZodError } from "zod";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { mapActivityMessages } from "@/src/components/chat/map-messages";
import { findUserChannelByUserId } from "@/src/repo/users.repo";
import { handleIncomingMessage } from "@/src/services/message-service";
import { findMessagesTimelinePage } from "@/src/services/conversation-timeline-service";
import { WebChannel } from "@/src/lib/channels/web-channel";
import type { IncomingMessage } from "@/src/types/domain";

const PostMessageSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();
    const before = new URL(request.url).searchParams.get("before") ?? undefined;
    const { messages, hasMore } = await findMessagesTimelinePage(user.id, before);
    return Response.json({ messages: mapActivityMessages(messages), hasMore });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[get/api/app/messages]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();
    const { text } = PostMessageSchema.parse(await request.json());
    const userChannel = await findUserChannelByUserId(user.id);
    if (!userChannel) {
      return Response.json({ error: "channel not found" }, { status: 409 });
    }

    const input: IncomingMessage = {
      channelUserId: userChannel.channelUserId,
      channelUserPhone: userChannel.channelUserPhone ?? undefined,
      channelUsername: userChannel.channelUsername ?? undefined,
      channelType: "whatsapp",
      contactName: user.name ?? undefined,
      text,
      externalId: ulid(),
      receivedAt: new Date(),
    };

    after(() => handleIncomingMessage(input, new WebChannel()));

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    console.error("[post/api/app/messages]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
