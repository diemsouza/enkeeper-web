import { AnswerEvaluationResult } from "../lib/llm-schemas";
import { generateSpeech } from "../vendors/tts.vendor";
import { uploadFile } from "../vendors/storage.vendor";
import { updateQuestion } from "../repo/questions.repo";
import { createMedia } from "../repo/media.repo";
import { MEDIA_PARENT_TYPE } from "../lib/constants";
import { formatFeedbackToSpeech } from "../core/formatters";

const AUDIO_ROLLOUT_FRACTION = parseFloat(
  process.env.AUDIO_ROLLOUT_FRACTION ?? "0",
);

export async function resolveFeedbackAudioPath(
  feedbackResult: AnswerEvaluationResult,
  questionId: string,
): Promise<string | null> {
  const random = Math.random();
  if (random >= AUDIO_ROLLOUT_FRACTION) {
    console.info(
      `[resolveFeedbackAudioPath] skipping TTS for ${questionId} (random=${random} >= ${AUDIO_ROLLOUT_FRACTION})`,
    );
    return null;
  }

  try {
    const speechText = formatFeedbackToSpeech(feedbackResult).text;

    const speech = await generateSpeech(speechText);
    if (speech.status === "error") {
      console.error(
        `[resolveFeedbackAudioPath] TTS failed for ${questionId}: ${speech.reason}`,
      );
      return null;
    }

    const filePath = `feedback/${questionId}_${Date.now()}.ogg`;
    await uploadFile({
      filePath,
      file: new Blob([new Uint8Array(speech.audio)], { type: speech.mimeType }),
    });
    const media = await createMedia({
      parentId: questionId,
      parentType: MEDIA_PARENT_TYPE.QUESTION,
      mediaType: "audio",
      contentType: speech.mimeType,
      mediaPath: filePath,
      mediaSize: speech.audio.length,
      mediaTranscription: speechText,
    });
    await updateQuestion(questionId, { feedbackAudioMediaId: media.id });
    return filePath;
  } catch (err) {
    // regra de negocio explicita: qualquer falha no pipeline de audio degrada silenciosamente pro texto
    console.error(`[resolveFeedbackAudioPath] failed for ${questionId}:`, err);
    return null;
  }
}
