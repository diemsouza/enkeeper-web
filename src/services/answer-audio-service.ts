import { ulid } from "ulid";
import { uploadFile } from "../vendors/storage.vendor";
import { updateQuestion } from "../repo/questions.repo";
import { createMedia } from "../repo/media.repo";
import {
  ANSWER_AUDIO_FOLDER,
  MEDIA_PARENT_TYPE,
  MEDIA_SOURCE,
} from "../lib/constants";
import { buildMediaPath } from "../lib/utils";

export async function storeAnswerAudio(
  buffer: Buffer,
  mimeType: string,
  transcription: string,
  question: { id: string; userId: string },
): Promise<void> {
  const questionId = question.id;
  try {
    const ext = mimeType.split("/")[1]?.split(";")[0] ?? "ogg";
    const mediaId = ulid();
    const filePath = buildMediaPath(ANSWER_AUDIO_FOLDER, mediaId, ext);
    await uploadFile({
      filePath,
      file: new Blob([new Uint8Array(buffer)], { type: mimeType }),
    });
    const media = await createMedia({
      id: mediaId,
      userId: question.userId,
      source: MEDIA_SOURCE.USER,
      parentId: questionId,
      parentType: MEDIA_PARENT_TYPE.QUESTION,
      mediaType: "audio",
      contentType: mimeType,
      mediaPath: filePath,
      mediaSize: buffer.length,
      mediaTranscription: transcription,
    });
    await updateQuestion(questionId, { answerAudioMediaId: media.id });
  } catch (err) {
    console.error(`[storeAnswerAudio] failed for ${questionId}:`, err);
  }
}
