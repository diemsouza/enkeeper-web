export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  processActivityCron,
  processExpiredFlowIntents,
} from "@/src/services/activity-cron.service";
import { resolveChannel } from "@/src/lib/channels/resolve-channel";

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const channel = resolveChannel();
    const result = await processActivityCron(channel);
    const flowResult = await processExpiredFlowIntents(channel);
    return NextResponse.json({
      activity: result,
      expiredFlowIntents: flowResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[get/api/cron/develop-activity] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
