export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { ZodError, z } from "zod";
import { getErrorMessage } from "@/src/lib/custom-errors";
// import { chatComputeService } from "@/src/services/chat-compute-service";

const ChatComputePayloadSchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
});

export const POST = verifySignatureAppRouter(async (req: Request) => {
  console.log("Queue: Received chat compute request");
  try {
    const body = await req.json();
    const payload = ChatComputePayloadSchema.parse(body);
    // const result = await chatComputeService.chatCompute(payload.chatId);
    const result = { success: true };
    return NextResponse.json(result);
  } catch (error: any) {
    let message =
      error instanceof Error ? error.message : "Chat compute error!";

    if (error instanceof ZodError) {
      message = error.errors[0]?.message || "Invalid payload!";
    }

    console.error("Chat compute error:", message);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, message) },
      { status: 500 },
    );
  }
});
