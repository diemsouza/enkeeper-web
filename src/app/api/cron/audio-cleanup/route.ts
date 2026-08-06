export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { processAudioCleanup } from "@/src/services/audio-cleanup-cron.service";

export async function GET(): Promise<NextResponse> {
  const authHeader = (await headers()).get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processAudioCleanup();
    return NextResponse.json({ audioCleanup: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[get/api/cron/audio-cleanup] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
