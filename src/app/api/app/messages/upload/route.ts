import { after } from "next/server";
import { ulid } from "ulid";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { handleIncomingMessage } from "@/src/services/message-service";
import { resolveChannel } from "@/src/lib/channels/resolve-channel";
import { OCR_IMAGE_FOLDER } from "@/src/lib/constants";
import { buildMediaPath } from "@/src/lib/utils";
import {
  extractTextFromImage,
  extractTextFromPdf,
} from "@/src/vendors/llm.vendor";
import { uploadFile } from "@/src/vendors/storage.vendor";
import { readImageDimensions } from "@/src/lib/image-dimensions";
import type { IncomingMessage } from "@/src/types/domain";
import { isAcceptedVoiceNote } from "@/src/core/voice-note";
import {
  processVoiceNote,
  storeVoiceNote,
} from "@/src/services/voice-note-service";

export async function POST(request: Request): Promise<Response> {
  const receivedAt = new Date();

  try {
    const user = await requireAuth();

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

    const externalIdField = formData.get("externalId");
    const resolvedExternalId =
      typeof externalIdField === "string" && externalIdField.trim().length > 0
        ? externalIdField.trim()
        : ulid();

    const baseInput: IncomingMessage = {
      userId: user.id,
      externalId: resolvedExternalId,
      receivedAt,
    };

    let extractedText: string;
    let mediaMetadata: Record<string, string | number | null>;
    const buffer = Buffer.from(await file.arrayBuffer());

    // O upload e a confirmacao do envio; transcricao e avaliacao rodam depois
    // da resposta.
    if (mediaType === "audio") {
      if (!isAcceptedVoiceNote(file.type, file.size)) {
        return Response.json({ error: "unsupported audio" }, { status: 400 });
      }
      const voiceNote = await storeVoiceNote(buffer, file.type);
      after(() => processVoiceNote(voiceNote, user.id, baseInput));
      return Response.json({ ok: true, externalId: resolvedExternalId });
    }

    if (mediaType === "image") {
      const mimeType = file.type || "image/jpeg";
      const format = mimeType.split("/")[1]?.split(";")[0] ?? "jpeg";
      const mediaId = ulid();
      let mediaPath: string | null = null;
      try {
        mediaPath = buildMediaPath(OCR_IMAGE_FOLDER, mediaId, format);
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

      const dimensions = readImageDimensions(buffer);
      const visionResult = await extractTextFromImage(buffer, user.id);
      extractedText = visionResult.content;
      mediaMetadata = {
        mediaType: "image",
        status: visionResult.status,
        transcriptionType: visionResult.transcription_type,
        statusMessage: visionResult.status_message,
        sizeBytes: file.size,
        format,
        mediaId,
        mediaPath,
        file_name: file.name,
        size_bytes: file.size,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
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
      ...baseInput,
      text: extractedText,
      mediaType,
      mediaMetadata,
    };

    after(() => handleIncomingMessage(input, resolveChannel()));

    return Response.json({ ok: true, externalId: resolvedExternalId });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[post/api/app/messages/upload]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
