export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { ZodError, z } from "zod";
import { getErrorMessage } from "@/src/lib/custom-errors";
// import { chatDispatchService } from "@/src/services/chat-dispatch-service";

const ChatDispatchPayloadSchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
});

export const POST = verifySignatureAppRouter(async (req: Request) => {
  console.log("Queue: Received chat dispatch request");
  try {
    const body = await req.json();
    const payload = ChatDispatchPayloadSchema.parse(body);
    // const result = await chatDispatchService.chatDispatch(payload.chatId);
    const result = { success: true };
    return NextResponse.json(result);
  } catch (error: any) {
    let message =
      error instanceof Error ? error.message : "Chat dispatch error!";

    if (error instanceof ZodError) {
      message = error.errors[0]?.message || "Invalid payload!";
    }

    console.error("Chat dispatch error:", message);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, message) },
      { status: 500 },
    );
  }
});
