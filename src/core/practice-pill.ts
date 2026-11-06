import { AUTO_QUESTION_ENABLED, PRACTICE_TURN_MAX_SEC } from "../lib/constants";
import { canPracticeToday } from "./limits";

export type PracticeActions = {
  questionId: string;
  messageId: string;
  rating: boolean | null;
  canContinue: boolean;
};

export type PracticePillState = {
  isVisible: boolean;
  intensiveUntil: string | null;
  isLimitReached: boolean;
  practiceActions: PracticeActions | null;
};

// O turno so termina depois do feedback, do audio e da dica: antes disso o
// Continuar apareceria no meio da sequencia.
export function isTurnInProgress(
  user: { lastRequestAt: Date | null; lastResponseAt: Date | null },
  now: number,
): boolean {
  const { lastRequestAt, lastResponseAt } = user;
  if (!lastRequestAt) return false;
  if (lastResponseAt && lastResponseAt >= lastRequestAt) return false;
  return now - lastRequestAt.getTime() < PRACTICE_TURN_MAX_SEC * 1000;
}

// AUTO_QUESTION_ENABLED true: a proxima pergunta chega sozinha, entao o
// Continuar nunca aparece.
export function resolvePracticeActions(input: {
  question: { id: string; rating: boolean | null };
  messageId: string;
  isLimitReached: boolean;
  hasNextQuestion: boolean;
}): PracticeActions {
  const { question, messageId, isLimitReached, hasNextQuestion } = input;
  return {
    questionId: question.id,
    messageId,
    rating: question.rating,
    canContinue: !AUTO_QUESTION_ENABLED && !isLimitReached && hasNextQuestion,
  };
}

export function resolvePracticePillState(input: {
  hasActiveActivity: boolean;
  intensiveUntil: Date | null;
  isLimitReached: boolean;
  practiceActions: PracticeActions | null;
}): PracticePillState {
  return {
    isVisible: input.hasActiveActivity,
    intensiveUntil: input.intensiveUntil?.toISOString() ?? null,
    isLimitReached: input.isLimitReached,
    practiceActions: input.practiceActions,
  };
}

export function isPracticeLimitReached(
  practiceCount: number,
  intensiveCount: number,
): boolean {
  return !canPracticeToday(practiceCount, intensiveCount, true);
}

export function isPracticePillActive(
  state: PracticePillState,
  now: number,
): boolean {
  if (state.isLimitReached) return false;
  if (!state.intensiveUntil) return true;
  return new Date(state.intensiveUntil).getTime() <= now;
}
