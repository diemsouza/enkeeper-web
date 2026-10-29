import { ulid } from "ulid";
import {
  MATERIAL_MAX_BYTES,
  MEDIA_PARENT_TYPE,
  MEDIA_SOURCE,
  OCR_IMAGE_FOLDER,
} from "../lib/constants";
import { buildMediaPath } from "../lib/utils";
import { readImageDimensions } from "../lib/image-dimensions";
import {
  extractTextFromImage,
  extractTextFromPdf,
} from "../vendors/llm.vendor";
import { uploadFile } from "../vendors/storage.vendor";
import { createMedia } from "../repo/media.repo";
import { validateDocItemInput } from "./doc-item-service";

export type MaterialMediaType = "image" | "pdf" | "text";

export type MaterialExtractError =
  | "blocked"
  | "unreadable"
  | "empty"
  | "unsupported"
  | "too_large";

// messageId e pre-gerado: a Media da imagem nasce ligada a mensagem que so e
// gravada quando o usuario confirma a criacao na modal.
export type MaterialExtractResult =
  | {
      ok: true;
      messageId: string;
      mediaType: MaterialMediaType;
      text: string;
      mediaId: string | null;
    }
  | { ok: false; code: MaterialExtractError };

const TEXT_FILE_EXTENSIONS = [".txt", ".md"];
const TEXT_CONTENT_TYPES = ["text/plain", "text/markdown"];

export function resolveMaterialMediaType(file: File): MaterialMediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  const name = file.name.toLowerCase();
  if (
    TEXT_CONTENT_TYPES.includes(file.type) ||
    TEXT_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))
  ) {
    return "text";
  }
  return null;
}

export async function extractMaterialFile(
  file: File,
  userId: string,
): Promise<MaterialExtractResult> {
  const mediaType = resolveMaterialMediaType(file);
  if (!mediaType) return { ok: false, code: "unsupported" };
  if (file.size > MATERIAL_MAX_BYTES) return { ok: false, code: "too_large" };

  const buffer = Buffer.from(await file.arrayBuffer());
  const messageId = ulid();

  if (mediaType === "image") {
    return extractImage(file, buffer, userId, messageId);
  }

  const text =
    mediaType === "pdf"
      ? await extractTextFromPdf(buffer)
      : buffer.toString("utf-8");
  if (!validateDocItemInput(text, mediaType).success) {
    return { ok: false, code: "empty" };
  }
  return { ok: true, messageId, mediaType, text, mediaId: null };
}

async function extractImage(
  file: File,
  buffer: Buffer,
  userId: string,
  messageId: string,
): Promise<MaterialExtractResult> {
  const contentType = file.type || "image/jpeg";
  const format = contentType.split("/")[1]?.split(";")[0] ?? "jpeg";
  const mediaId = ulid();
  const mediaPath = buildMediaPath(OCR_IMAGE_FOLDER, mediaId, format);
  await uploadFile({
    filePath: mediaPath,
    file: new Blob([new Uint8Array(buffer)], { type: contentType }),
  });

  const vision = await extractTextFromImage(buffer, userId);
  if (vision.status === "blocked") return { ok: false, code: "blocked" };
  if (vision.status !== "ok") return { ok: false, code: "unreadable" };
  if (!validateDocItemInput(vision.content, "image").success) {
    return { ok: false, code: "empty" };
  }

  const dimensions = readImageDimensions(buffer);
  await createMedia({
    id: mediaId,
    userId,
    source: MEDIA_SOURCE.USER,
    parentId: messageId,
    parentType: MEDIA_PARENT_TYPE.MESSAGE,
    mediaType: "image",
    contentType,
    mediaPath,
    mediaSize: file.size,
    mediaTranscription: vision.content,
    metadata: dimensions ? { ...dimensions } : undefined,
  });
  return { ok: true, messageId, mediaType: "image", text: vision.content, mediaId };
}
