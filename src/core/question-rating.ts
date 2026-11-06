import type { QuestionRatingKind } from "../lib/prisma";

export const QUESTION_PROBLEM_KINDS = [
  "image_mismatch",
  "confusing_question",
  "answer_was_right",
  "audio_or_explanation",
  "other",
] as const satisfies readonly QuestionRatingKind[];

export const QUESTION_LEVEL_KINDS = [
  "too_easy",
  "too_hard",
] as const satisfies readonly QuestionRatingKind[];

export const DISLIKE_KINDS = [
  ...QUESTION_PROBLEM_KINDS,
  ...QUESTION_LEVEL_KINDS,
] as const;

const PROBLEM_KINDS: readonly QuestionRatingKind[] = QUESTION_PROBLEM_KINDS;

export function shouldRegenerateQuestion(
  rating: boolean,
  ratingKind: QuestionRatingKind | null,
): boolean {
  return !rating && !!ratingKind && PROBLEM_KINDS.includes(ratingKind);
}
