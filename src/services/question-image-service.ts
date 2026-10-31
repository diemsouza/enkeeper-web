import { ulid } from "ulid";
import { generateImage, GenerateImageResult } from "../vendors/image.vendor";
import { downloadFile, uploadFile } from "../vendors/storage.vendor";
import { createMedia, findUserMediaById } from "../repo/media.repo";
import {
  MEDIA_PARENT_TYPE,
  MEDIA_SOURCE,
  MEDIA_TYPE,
  QUESTION_IMAGE_EXTENSION,
  QUESTION_IMAGE_FOLDER,
} from "../lib/constants";
import { buildMediaPath } from "../lib/utils";

export type StoreQuestionImageResult =
  { status: "success"; mediaId: string } | { status: "error"; reason: string };

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : "unknown";
}

export type EvalImage = { data: Buffer; mediaType: string };

// Bytes em vez de URL: o provider baixaria a URL do lado dele e nao alcanca o
// storage local. Sem midia, a avaliacao segue so com o texto.
export async function loadQuestionImageForEval(
  imageMediaId: string | null,
  userId: string,
): Promise<EvalImage | undefined> {
  if (!imageMediaId) return undefined;
  const media = await findUserMediaById(imageMediaId, userId);
  if (!media) {
    console.warn(
      `[loadQuestionImageForEval] media ${imageMediaId} not found for user ${userId}`,
    );
    return undefined;
  }
  const data = await downloadFile({ filePath: media.mediaPath });
  return { data, mediaType: media.contentType };
}

export async function storeQuestionImage(params: {
  questionId: string;
  description: string;
  userId: string;
  docId: string;
}): Promise<StoreQuestionImageResult> {
  const { questionId, description, userId, docId } = params;

  let generated: GenerateImageResult;
  try {
    generated = await generateImage(description, { userId, docId });
  } catch (err) {
    generated = { status: "error", reason: describeError(err) };
  }
  if (generated.status === "error") {
    return {
      status: "error",
      reason: `image_vendor_error: ${generated.reason}`,
    };
  }

  const mediaId = ulid();
  const mediaPath = buildMediaPath(
    QUESTION_IMAGE_FOLDER,
    mediaId,
    QUESTION_IMAGE_EXTENSION,
  );

  try {
    await uploadFile({
      filePath: mediaPath,
      file: new Blob([new Uint8Array(generated.image)], {
        type: generated.mimeType,
      }),
    });
  } catch (err) {
    return { status: "error", reason: `upload_error: ${describeError(err)}` };
  }

  try {
    await createMedia({
      id: mediaId,
      userId,
      source: MEDIA_SOURCE.SYSTEM,
      parentId: questionId,
      parentType: MEDIA_PARENT_TYPE.QUESTION,
      mediaType: MEDIA_TYPE.IMAGE,
      contentType: generated.mimeType,
      mediaPath,
      mediaSize: generated.image.length,
      mediaTranscription: description,
      metadata: { width: generated.width, height: generated.height },
    });
  } catch (err) {
    return {
      status: "error",
      reason: `media_record_error: ${describeError(err)}`,
    };
  }

  return { status: "success", mediaId };
}
