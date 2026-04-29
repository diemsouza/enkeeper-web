export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { processActivityCron } from "@/src/services/activity-cron.service";

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const result = await processActivityCron();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[cron/develop-activity] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
