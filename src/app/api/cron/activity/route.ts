export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  processActivityCron,
  processExpiredFlowIntents,
} from "@/src/services/activity-cron.service";
import { processDueNotifications } from "@/src/services/notification-cron.service";
import { resolveChannel } from "@/src/lib/channels/resolve-channel";

export async function GET(): Promise<NextResponse> {
  const authHeader = (await headers()).get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const channel = resolveChannel();
    const result = await processActivityCron(channel);
    const flowResult = await processExpiredFlowIntents(channel);
    const notificationResult = await processDueNotifications();
    return NextResponse.json({
      activity: result,
      expiredFlowIntents: flowResult,
      notifications: notificationResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[get/api/cron/activity] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
