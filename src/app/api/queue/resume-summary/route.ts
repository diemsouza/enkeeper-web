export const runtime = "nodejs";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { ZodError, z } from "zod";
import { getErrorMessage } from "@/src/lib/custom-errors";
import { sendResumeSummary } from "@/src/services/activity-service";
import { resolveChannel } from "@/src/lib/channels/resolve-channel";
import { WebChannel } from "@/src/lib/channels/web-channel";

const ResumeSummaryPayloadSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  leavingActivityId: z.string().min(1).nullable(),
  targetActivityId: z.string().min(1, "targetActivityId is required"),
  source: z.enum(["web", "whatsapp"]),
});

export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const body = await req.json();
    const payload = ResumeSummaryPayloadSchema.parse(body);
    const channel =
      payload.source === "web" ? new WebChannel() : resolveChannel();
    await sendResumeSummary({
      userId: payload.userId,
      leavingActivityId: payload.leavingActivityId,
      targetActivityId: payload.targetActivityId,
      channel,
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    let message =
      error instanceof Error ? error.message : "Resume summary error!";

    if (error instanceof ZodError) {
      message = error.errors[0]?.message || "Invalid payload!";
    }

    const err = error instanceof Error ? error : new Error(message);
    console.error(
      "[post/api/queue/resume-summary] Resume summary error:",
      message,
    );
    return NextResponse.json(
      { success: false, message: getErrorMessage(err, message) },
      { status: 500 },
    );
  }
});
