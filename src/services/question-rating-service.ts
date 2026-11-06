import { QuestionRatingKind } from "../lib/prisma";
import { QuestionRatingConflictError } from "../lib/custom-errors";
import { shouldRegenerateQuestion } from "../core/question-rating";
import { findLastActiveActivityByUser } from "../repo/activities.repo";
import { saveQuestionRating } from "../repo/questions.repo";
import { findPracticeActions } from "./practice-pill-service";

// Status, score, contadores e SM-2 ficam de fora: a avaliacao e sobre a
// pergunta, nao sobre a tentativa.
export async function rateQuestion(params: {
  userId: string;
  questionId: string;
  rating: boolean;
  ratingKind: QuestionRatingKind | null;
  ratingNote: string | null;
}): Promise<void> {
  const { userId, questionId, rating, ratingKind, ratingNote } = params;
  const activity = await findLastActiveActivityByUser(userId);
  const actions = activity ? await findPracticeActions(activity, userId) : null;
  if (actions?.questionId !== questionId || actions.rating !== null) {
    throw new QuestionRatingConflictError();
  }
  const isSaved = await saveQuestionRating({
    id: questionId,
    userId,
    rating,
    ratingKind,
    ratingNote,
    regenerate: shouldRegenerateQuestion(rating, ratingKind),
  });
  if (!isSaved) throw new QuestionRatingConflictError();
}
