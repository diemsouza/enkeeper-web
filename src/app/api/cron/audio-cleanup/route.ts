export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  processAudioCleanup,
  processImageCleanup,
} from "@/src/services/audio-cleanup-cron.service";
import { deleteExpiredShortLinks } from "@/src/repo/shortlinks.repo";
import { SHORTLINK_CLEANUP_TTL_DAYS } from "@/src/lib/constants";

export async function GET(): Promise<NextResponse> {
  const authHeader = (await headers()).get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const shortLinkThreshold = new Date(
      Date.now() - SHORTLINK_CLEANUP_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    const [audioResult, imageResult, shortLinkDeleted] = await Promise.all([
      processAudioCleanup(),
      processImageCleanup(),
      deleteExpiredShortLinks(shortLinkThreshold),
    ]);
    return NextResponse.json({
      audioCleanup: audioResult,
      imageCleanup: imageResult,
      shortLinkCleanup: { deleted: shortLinkDeleted },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[get/api/cron/audio-cleanup] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
