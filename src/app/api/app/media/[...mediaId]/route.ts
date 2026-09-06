import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { findMessageByMediaId } from "@/src/repo/messages.repo";
import { downloadFile } from "@/src/vendors/storage.vendor";
import { TTS_MIME_TYPE } from "@/src/vendors/tts.vendor";

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

    const buffer = await downloadFile({ filePath: mediaId });
    const contentType =
      message.mediaType === "audio" ? TTS_MIME_TYPE : "image/png";

    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return new Response("Unauthorized", { status: 401 });
    }
    console.error("[get/api/app/media]", error);
    return new Response("Not found", { status: 404 });
  }
}
