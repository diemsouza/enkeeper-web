import { z, ZodError } from "zod";
import { requireAuth } from "@/src/lib/auth/current-user";
import {
  QuestionRatingConflictError,
  UnauthorizedError,
} from "@/src/lib/custom-errors";
import { QUESTION_RATING_NOTE_MAX_LENGTH } from "@/src/lib/constants";
import { DISLIKE_KINDS } from "@/src/core/question-rating";
import { rateQuestion } from "@/src/services/question-rating-service";

const RatingSchema = z
  .object({
    questionId: z.string().trim().min(1).max(64),
    rating: z.boolean(),
    ratingKind: z.enum(DISLIKE_KINDS).nullable(),
    ratingNote: z.string().trim().max(QUESTION_RATING_NOTE_MAX_LENGTH),
  })
  .refine((data) => data.rating === (data.ratingKind === null));

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();
    const data = RatingSchema.parse(await request.json());
    await rateQuestion({
      ...data,
      userId: user.id,
      ratingNote: data.ratingNote || null,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    if (error instanceof QuestionRatingConflictError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 409 },
      );
    }
    console.error("[post/api/app/practice/rating]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
