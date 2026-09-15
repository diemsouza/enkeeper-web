export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { decideDailyReminders } from "@/src/services/daily-reminder-cron.service";

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const result = await decideDailyReminders();
    return NextResponse.json({ dailyReminder: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[get/api/cron/develop-daily-reminder] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
