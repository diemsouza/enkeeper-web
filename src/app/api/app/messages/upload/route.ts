import { after } from "next/server";
import { ulid } from "ulid";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { findUserChannelByUserId } from "@/src/repo/users.repo";
import { handleIncomingMessage } from "@/src/services/message-service";
import { WebChannel } from "@/src/lib/channels/web-channel";
import {
  extractTextFromImage,
  extractTextFromPdf,
} from "@/src/vendors/llm.vendor";
import { uploadFile } from "@/src/vendors/storage.vendor";
import type { IncomingMessage } from "@/src/types/domain";

export async function POST(request: Request): Promise<Response> {
  const receivedAt = new Date();

  try {
    const user = await requireAuth();
    const userChannel = await findUserChannelByUserId(user.id);
    if (!userChannel) {
      return Response.json({ error: "channel not found" }, { status: 409 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: "invalid form data" }, { status: 400 });
    }

    const mediaType = formData.get("mediaType");
    const file = formData.get("file");
    if (typeof mediaType !== "string" || !(file instanceof File)) {
      return Response.json({ error: "invalid form data fields" }, { status: 400 });
    }

    let extractedText: string;
    let mediaMetadata: Record<string, string | number | null>;
    const buffer = Buffer.from(await file.arrayBuffer());

    if (mediaType === "image") {
      const mimeType = file.type || "image/jpeg";
      const format = mimeType.split("/")[1]?.split(";")[0] ?? "jpeg";
      let mediaPath: string | null = null;
      try {
        mediaPath = `ocr/${ulid()}.${format}`;
        await uploadFile({
          filePath: mediaPath,
          file: new Blob([new Uint8Array(buffer)], { type: mimeType }),
        });
      } catch (err) {
        console.error(
          "[post/api/app/messages/upload] falha ao salvar imagem no storage:",
          err,
        );
        mediaPath = null;
      }

      const visionResult = await extractTextFromImage(buffer, user.id);
      extractedText = visionResult.content;
      mediaMetadata = {
        mediaType: "image",
        status: visionResult.status,
        transcriptionType: visionResult.transcription_type,
        statusMessage: visionResult.status_message,
        sizeBytes: file.size,
        format,
        mediaPath,
        file_name: file.name,
        size_bytes: file.size,
      };
    } else if (mediaType === "pdf") {
      extractedText = await extractTextFromPdf(buffer);
      mediaMetadata = {
        media_type: mediaType,
        file_name: file.name,
        size_bytes: file.size,
      };
    } else if (mediaType === "text") {
      extractedText = buffer.toString("utf-8");
      mediaMetadata = {
        media_type: mediaType,
        file_name: file.name,
        size_bytes: file.size,
      };
    } else {
      return Response.json({ error: "unsupported mediaType" }, { status: 400 });
    }

    const input: IncomingMessage = {
      channelUserId: userChannel.channelUserId,
      channelUserPhone: userChannel.channelUserPhone ?? undefined,
      channelUsername: userChannel.channelUsername ?? undefined,
      channelType: "whatsapp",
      contactName: user.name ?? undefined,
      text: extractedText,
      externalId: ulid(),
      mediaType,
      mediaMetadata,
      receivedAt,
    };

    after(() => handleIncomingMessage(input, new WebChannel()));

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[post/api/app/messages/upload]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
