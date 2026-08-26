export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  processAudioCleanup,
  processImageCleanup,
} from "@/src/services/audio-cleanup-cron.service";

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const [audioResult, imageResult] = await Promise.all([
      processAudioCleanup(),
      processImageCleanup(),
    ]);
    return NextResponse.json({
      audioCleanup: audioResult,
      imageCleanup: imageResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[get/api/cron/develop-audio-cleanup] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
