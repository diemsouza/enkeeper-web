export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { ZodError, z } from "zod";
import { getErrorMessage } from "@/src/lib/custom-errors";
import { mergeDoc } from "@/src/services/merge-doc-service";
import { resolveChannel } from "@/src/lib/channels/resolve-channel";

const MergeDocPayloadSchema = z.object({
  docId: z.string().min(1, "docId is required"),
  userId: z.string().min(1, "userId is required"),
  latestDocItemId: z.string().min(1, "latestDocItemId is required"),
});

export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const body = await req.json();
    const payload = MergeDocPayloadSchema.parse(body);
    await mergeDoc(payload.docId, payload.userId, payload.latestDocItemId, resolveChannel());
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    let message = error instanceof Error ? error.message : "Merge doc error!";

    if (error instanceof ZodError) {
      message = error.errors[0]?.message || "Invalid payload!";
    }

    const err = error instanceof Error ? error : new Error(message);
    console.error("Merge doc error:", message);
    return NextResponse.json(
      { success: false, message: getErrorMessage(err, message) },
      { status: 500 },
    );
  }
});
