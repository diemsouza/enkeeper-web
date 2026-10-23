import { updateQuestion } from "../repo/questions.repo";

// O audio ja foi salvo como Media da mensagem do usuario; a pergunta so
// referencia o mesmo registro.
export async function linkAnswerAudio(
  questionId: string,
  mediaId: string,
): Promise<void> {
  await updateQuestion(questionId, { answerAudioMediaId: mediaId });
}
