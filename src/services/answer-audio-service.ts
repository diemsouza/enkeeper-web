import { uploadFile } from "../vendors/storage.vendor";
import { updateQuestion } from "../repo/questions.repo";
import { createMedia } from "../repo/media.repo";
import { MEDIA_PARENT_TYPE } from "../lib/constants";

export async function resolveAnswerAudioPath(
  buffer: Buffer,
  mimeType: string,
  transcription: string,
  questionId: string,
): Promise<string | null> {
  try {
    const ext = mimeType.split("/")[1]?.split(";")[0] ?? "ogg";
    const filePath = `answer/${questionId}_${Date.now()}.${ext}`;
    await uploadFile({
      filePath,
      file: new Blob([new Uint8Array(buffer)], { type: mimeType }),
    });
    const media = await createMedia({
      parentId: questionId,
      parentType: MEDIA_PARENT_TYPE.QUESTION,
      mediaType: "audio",
      contentType: mimeType,
      mediaPath: filePath,
      mediaSize: buffer.length,
      mediaTranscription: transcription,
    });
    await updateQuestion(questionId, { answerAudioMediaId: media.id });
    return filePath;
  } catch (err) {
    console.error(`[resolveAnswerAudioPath] failed for ${questionId}:`, err);
    return null;
  }
}
