export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  processAudioCleanup,
  processImageCleanup,
} from "@/src/services/audio-cleanup-cron.service";
import { deleteExpiredShortLinks } from "@/src/repo/shortlinks.repo";
import {
  MEDIA_CLEANUP_ENABLED,
  SHORTLINK_CLEANUP_TTL_DAYS,
} from "@/src/lib/constants";

type MediaCleanupResponse = {
  audioCleanup: Awaited<ReturnType<typeof processAudioCleanup>> | "paused";
  imageCleanup: Awaited<ReturnType<typeof processImageCleanup>> | "paused";
};

async function runMediaCleanup(): Promise<MediaCleanupResponse> {
  if (!MEDIA_CLEANUP_ENABLED) {
    return { audioCleanup: "paused", imageCleanup: "paused" };
  }
  const [audioCleanup, imageCleanup] = await Promise.all([
    processAudioCleanup(),
    processImageCleanup(),
  ]);
  return { audioCleanup, imageCleanup };
}

export async function GET(): Promise<NextResponse> {
  const authHeader = (await headers()).get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const shortLinkThreshold = new Date(
      Date.now() - SHORTLINK_CLEANUP_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    const [mediaCleanup, shortLinkDeleted] = await Promise.all([
      runMediaCleanup(),
      deleteExpiredShortLinks(shortLinkThreshold),
    ]);
    return NextResponse.json({
      ...mediaCleanup,
      shortLinkCleanup: { deleted: shortLinkDeleted },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[get/api/cron/audio-cleanup] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
