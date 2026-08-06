import { Level, QuestionFormat } from "../lib/prisma";
import { generateSpeech } from "../vendors/tts.vendor";
import { uploadFile } from "../vendors/storage.vendor";
import { updateQuestion } from "../repo/questions.repo";
import { formatQuestion, formatQuestionToSpeechText } from "../core/formatters";

const AUDIO_ROLLOUT_FRACTION = parseFloat(
  process.env.AUDIO_ROLLOUT_FRACTION ?? "0",
);

export async function resolveQuestionAudioPath(
  question: {
    id: string;
    question: string;
    questionFormat: QuestionFormat | null;
    questionOptions: string[];
    termHint?: string | null;
    audioPath: string | null;
    audioDeletedAt: Date | null;
  },
  level: Level,
): Promise<string | null> {
  console.log(level, question.questionFormat);
  if (
    question.questionFormat !== QuestionFormat.scenario &&
    question.questionFormat !== QuestionFormat.gap_fill
  )
    return null;

  if (
    level === Level.basic &&
    question.questionFormat === QuestionFormat.scenario
  )
    return null;

  const random = Math.random();
  if (random >= AUDIO_ROLLOUT_FRACTION) {
    console.info(
      `[resolveQuestionAudioPath] skipping TTS for ${question.id} (random=${random} >= ${AUDIO_ROLLOUT_FRACTION})`,
    );
    return null;
  }

  try {
    if (question.audioPath && !question.audioDeletedAt)
      return question.audioPath;

    const speechText = formatQuestionToSpeechText(
      formatQuestion(question),
      question.questionFormat,
    );

    const speech = await generateSpeech(speechText);
    if (speech.status === "error") {
      console.error(
        `[resolveQuestionAudioPath] TTS failed for ${question.id}: ${speech.reason}`,
      );
      return null;
    }

    const filePath = `questions/${question.id}.ogg`;
    await uploadFile({
      filePath,
      file: new Blob([new Uint8Array(speech.audio)], { type: speech.mimeType }),
    });
    await updateQuestion(question.id, {
      audioPath: filePath,
      audioCreatedAt: new Date(),
      audioDeletedAt: null,
    });
    return filePath;
  } catch (err) {
    // regra de negocio explicita: qualquer falha no pipeline de audio degrada silenciosamente pro texto
    console.error(`[resolveQuestionAudioPath] failed for ${question.id}:`, err);
    return null;
  }
}
