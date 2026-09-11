import { requireAuth } from "@/src/lib/auth/current-user";
import {
  MEDIA_CACHE_SAFETY_MARGIN_SEC,
  MEDIA_EXPIRES_IN_SEC,
} from "@/src/lib/constants";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { findMessageByMediaId } from "@/src/repo/messages.repo";
import { createSignedUrl } from "@/src/vendors/storage.vendor";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mediaId: string[] }> },
): Promise<Response> {
  try {
    const user = await requireAuth();
    const { mediaId: segments } = await params;
    const mediaId = segments.join("/");

    const message = await findMessageByMediaId(mediaId, user.id);
    if (!message) return new Response("Not found", { status: 404 });

    const signedUrl = await createSignedUrl({
      filePath: mediaId,
      expiresIn: MEDIA_EXPIRES_IN_SEC,
    });

    return new Response(null, {
      status: 302,
      headers: {
        Location: signedUrl,
        "Cache-Control": `private, max-age=${MEDIA_EXPIRES_IN_SEC - MEDIA_CACHE_SAFETY_MARGIN_SEC}`,
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
