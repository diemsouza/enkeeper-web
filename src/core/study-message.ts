const STUDY_MESSAGE_INTENTS = new Set([
  "practice_question",
  "practice_feedback",
  "eval_tip",
]);

// O questionId separa estudo de aviso: o limite diario sai com intent
// practice_feedback, mas sem pergunta.
export function isStudyMessage({
  isUser,
  intent,
  questionId,
}: {
  isUser: boolean;
  intent: string | null;
  questionId: string | null;
}): boolean {
  return (
    !isUser &&
    intent !== null &&
    STUDY_MESSAGE_INTENTS.has(intent) &&
    questionId !== null
  );
}
