import { requireAuth } from "@/src/lib/auth/current-user";
import {
  MEDIA_INLINE_PARAM,
  MEDIA_CACHE_SAFETY_MARGIN_SEC,
  MEDIA_EXPIRES_IN_SEC,
} from "@/src/lib/constants";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { findUserMediaById } from "@/src/repo/media.repo";
import { createSignedUrl, downloadFile } from "@/src/vendors/storage.vendor";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ mediaId: string }> },
): Promise<Response> {
  try {
    const user = await requireAuth();
    const { mediaId } = await params;

    const media = await findUserMediaById(mediaId, user.id);
    if (!media) return new Response("Not found", { status: 404 });

    const cacheControl = `private, max-age=${MEDIA_EXPIRES_IN_SEC - MEDIA_CACHE_SAFETY_MARGIN_SEC}`;

    if (new URL(req.url).searchParams.get(MEDIA_INLINE_PARAM) === "1") {
      const file = await downloadFile({ filePath: media.mediaPath });
      return new Response(new Uint8Array(file), {
        headers: {
          "Content-Type": media.contentType,
          "Cache-Control": cacheControl,
        },
      });
    }

    const signedUrl = await createSignedUrl({
      filePath: media.mediaPath,
      expiresIn: MEDIA_EXPIRES_IN_SEC,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: signedUrl,
        "Cache-Control": cacheControl,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return new Response("Unauthorized", { status: 401 });
    }
    console.error("[get/api/app/media]", error);
    return new Response("Not found", { status: 404 });
  }
}
