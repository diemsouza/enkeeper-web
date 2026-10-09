import { parseBuffer } from "music-metadata";
import { ulid } from "ulid";
import { Question } from "../lib/prisma";
import { AnswerEvaluationResult } from "../lib/llm-schemas";
import { generateSpeech } from "../vendors/tts.vendor";
import { uploadFile } from "../vendors/storage.vendor";
import { updateQuestion } from "../repo/questions.repo";
import { createMedia, getMediaById } from "../repo/media.repo";
import {
  FEEDBACK_AUDIO_FOLDER,
  MEDIA_PARENT_TYPE,
  MEDIA_SOURCE,
} from "../lib/constants";
import { buildMediaPath } from "../lib/utils";
import { formatFeedbackToSpeech } from "../core/formatters";

const AUDIO_ROLLOUT_FRACTION = parseFloat(
  process.env.AUDIO_ROLLOUT_FRACTION ?? "0",
);

async function readAudioDuration(
  audio: Buffer,
  mimeType: string,
): Promise<number | null> {
  try {
    const { format } = await parseBuffer(audio, { mimeType });
    return typeof format.duration === "number" ? format.duration : null;
  } catch (err) {
    console.error("[readAudioDuration] failed to parse audio duration:", err);
    return null;
  }
}

export async function resolveFeedbackAudioMediaId(
  feedbackResult: AnswerEvaluationResult,
  question: Pick<
    Question,
    "id" | "userId" | "feedbackText" | "feedbackAudioMediaId"
  >,
): Promise<string | null> {
  const questionId = question.id;
  const random = Math.random();
  if (random >= AUDIO_ROLLOUT_FRACTION) {
    console.info(
      `[resolveFeedbackAudioMediaId] skipping TTS for ${questionId} (random=${random} >= ${AUDIO_ROLLOUT_FRACTION})`,
    );
    return null;
  }

  try {
    const speechText = formatFeedbackToSpeech(feedbackResult).text;

    if (
      question.feedbackAudioMediaId &&
      question.feedbackText === speechText
    ) {
      const existingMedia = await getMediaById(question.feedbackAudioMediaId);
      if (existingMedia) return existingMedia.id;
    }

    const speech = await generateSpeech(speechText);
    if (speech.status === "error") {
      console.error(
        `[resolveFeedbackAudioMediaId] TTS failed for ${questionId}: ${speech.reason}`,
      );
      return null;
    }

    const mediaId = ulid();
    const filePath = buildMediaPath(FEEDBACK_AUDIO_FOLDER, mediaId, "ogg");
    await uploadFile({
      filePath,
      file: new Blob([new Uint8Array(speech.audio)], { type: speech.mimeType }),
    });
    const duration = await readAudioDuration(speech.audio, speech.mimeType);
    const media = await createMedia({
      id: mediaId,
      userId: question.userId,
      source: MEDIA_SOURCE.SYSTEM,
      parentId: questionId,
      parentType: MEDIA_PARENT_TYPE.QUESTION,
      mediaType: "audio",
      contentType: speech.mimeType,
      mediaPath: filePath,
      mediaSize: speech.audio.length,
      mediaTranscription: speechText,
      metadata: duration !== null ? { duration } : undefined,
    });
    await updateQuestion(questionId, { feedbackAudioMediaId: media.id });
    return media.id;
  } catch (err) {
    // regra de negocio explicita: qualquer falha no pipeline de audio degrada silenciosamente pro texto
    console.error(`[resolveFeedbackAudioMediaId] failed for ${questionId}:`, err);
    return null;
  }
}
