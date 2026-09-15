export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { decideDailyReminders } from "@/src/services/daily-reminder-cron.service";

export async function GET(): Promise<NextResponse> {
  const authHeader = (await headers()).get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await decideDailyReminders();
    return NextResponse.json({ dailyReminder: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[get/api/cron/daily-reminder] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
