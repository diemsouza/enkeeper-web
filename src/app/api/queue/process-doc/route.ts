export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { ZodError, z } from "zod";
import { getErrorMessage } from "@/src/lib/custom-errors";
import { processDoc } from "@/src/services/process-doc-service";

const ProcessDocPayloadSchema = z.object({
  docId: z.string().min(1, "docId is required"),
  userId: z.string().min(1, "userId is required"),
});

export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const body = await req.json();
    const payload = ProcessDocPayloadSchema.parse(body);
    await processDoc(payload.docId, payload.userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    let message = error instanceof Error ? error.message : "Process doc error!";

    if (error instanceof ZodError) {
      message = error.errors[0]?.message || "Invalid payload!";
    }

    const err = error instanceof Error ? error : new Error(message);
    console.error("Process doc error:", message);
    return NextResponse.json(
      { success: false, message: getErrorMessage(err, message) },
      { status: 500 },
    );
  }
});
