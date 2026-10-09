import { ulid } from "ulid";
import {
  generateSpeech,
  GenerateSpeechResult,
  TTS_AUDIO_EXTENSION,
} from "../vendors/tts.vendor";
import { uploadFile } from "../vendors/storage.vendor";
import { createMedia } from "../repo/media.repo";
import {
  MEDIA_PARENT_TYPE,
  MEDIA_SOURCE,
  MEDIA_TYPE,
  QUESTION_AUDIO_FOLDER,
} from "../lib/constants";
import { buildMediaPath } from "../lib/utils";
import { readAudioDuration } from "./feedback-audio-service";

export type StoreQuestionAudioResult =
  { status: "success"; mediaId: string } | { status: "error"; reason: string };

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : "unknown";
}

async function synthesize(text: string): Promise<GenerateSpeechResult> {
  try {
    return await generateSpeech(text);
  } catch (err) {
    return { status: "error", reason: describeError(err) };
  }
}

export async function storeQuestionAudio(params: {
  questionId: string;
  text: string;
  userId: string;
}): Promise<StoreQuestionAudioResult> {
  const { questionId, text, userId } = params;

  const speech = await synthesize(text);
  if (speech.status === "error") {
    return { status: "error", reason: `tts_error: ${speech.reason}` };
  }

  const mediaId = ulid();
  const mediaPath = buildMediaPath(
    QUESTION_AUDIO_FOLDER,
    mediaId,
    TTS_AUDIO_EXTENSION,
  );

  try {
    await uploadFile({
      filePath: mediaPath,
      file: new Blob([new Uint8Array(speech.audio)], { type: speech.mimeType }),
    });
  } catch (err) {
    return { status: "error", reason: `upload_error: ${describeError(err)}` };
  }

  const duration = await readAudioDuration(speech.audio, speech.mimeType);
  try {
    await createMedia({
      id: mediaId,
      userId,
      source: MEDIA_SOURCE.SYSTEM,
      parentId: questionId,
      parentType: MEDIA_PARENT_TYPE.QUESTION,
      mediaType: MEDIA_TYPE.AUDIO,
      contentType: speech.mimeType,
      mediaPath,
      mediaSize: speech.audio.length,
      mediaTranscription: text,
      metadata: duration !== null ? { duration } : undefined,
    });
  } catch (err) {
    return {
      status: "error",
      reason: `media_record_error: ${describeError(err)}`,
    };
  }

  return { status: "success", mediaId };
}
