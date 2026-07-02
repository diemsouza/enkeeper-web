import { NextRequest } from "next/server";
import { getEmitter } from "../../../../lib/simulator-emitter";

function unauthorized(): Response {
  return new Response("Unauthorized", { status: 401 });
}

export async function GET(req: NextRequest): Promise<Response> {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.SIMULATE_SECRET) return unauthorized();

  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId) return new Response("channelId required", { status: 400 });

  const emitter = getEmitter(channelId);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const onMessage = (data: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };
      emitter.on("message", onMessage);
      req.signal.addEventListener("abort", () => {
        emitter.off("message", onMessage);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
