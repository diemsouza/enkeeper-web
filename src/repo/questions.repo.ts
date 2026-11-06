import {
  Question,
  QuestionFormat,
  QuestionStatus,
  AnswerType,
  QuestionType,
  AiProvider,
  EvalTipClass,
  QuestionRatingKind,
  Prisma,
} from "../lib/prisma";
import { prisma } from "../lib/prisma";

export type CreateQuestionData = {
  id?: string;
  question: string;
  answerKeys: string[];
  questionFormat?: QuestionFormat;
  questionOptions?: string[];
  term?: string;
  meaning?: string;
  termHint?: string;
  sourceContent?: string;
  provider?: AiProvider;
  model?: string;
  questionImageMediaId?: string;
  questionImageDescription?: string;
  questionAudioMediaId?: string;
};

export type RegeneratedQuestionContent = Pick<
  CreateQuestionData,
  | "question"
  | "answerKeys"
  | "questionFormat"
  | "questionOptions"
  | "questionImageMediaId"
  | "questionImageDescription"
  | "questionAudioMediaId"
> & { metadata: Record<string, unknown> };

export async function createQuestions(
  activity: { id: string; userId: string },
  questions: CreateQuestionData[],
): Promise<void> {
  await prisma.question.createMany({
    data: questions.map((q) => ({
      ...(q.id ? { id: q.id } : {}),
      activityId: activity.id,
      userId: activity.userId,
      question: q.question,
      answerKeys: q.answerKeys,
      ...(q.questionFormat ? { questionFormat: q.questionFormat } : {}),
      questionOptions: q.questionOptions ?? [],
      term: q.term,
      meaning: q.meaning,
      provider: q.provider,
      model: q.model,
      termHint: q.termHint,
      sourceContent: q.sourceContent,
      questionImageMediaId: q.questionImageMediaId,
      questionImageDescription: q.questionImageDescription,
      questionAudioMediaId: q.questionAudioMediaId,
    })),
  });
}

export async function findQuestionScoresByActivity(
  activityId: string,
): Promise<{ score: number }[]> {
  return prisma.question.findMany({
    where: { activityId },
    select: { score: true },
  });
}

export async function findNextUnansweredQuestion(
  docId: string,
  lastQuestionId: string | null,
): Promise<Question | null> {
  return prisma.question.findFirst({
    where: {
      deletedAt: null,
      status: null,
      ...(lastQuestionId ? { NOT: { id: lastQuestionId } } : {}),
      activity: { docId, deletedAt: null },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function findSm2EligibleQuestion(
  activityId: string,
  lastQuestionId: string | null,
): Promise<Question | null> {
  return prisma.question.findFirst({
    where: {
      activityId,
      deletedAt: null,
      nextRevisionAt: { lte: new Date() },
      ...(lastQuestionId ? { NOT: { id: lastQuestionId } } : {}),
    },
    orderBy: { nextRevisionAt: "asc" },
  });
}

export async function countSm2EligibleQuestions(
  activityId: string,
): Promise<number> {
  return prisma.question.count({
    where: {
      activityId,
      deletedAt: null,
      nextRevisionAt: { lte: new Date() },
    },
  });
}

export async function countSm2EligibleQuestionsByUser(
  userId: string,
): Promise<number> {
  return prisma.question.count({
    where: {
      deletedAt: null,
      nextRevisionAt: { lte: new Date() },
      activity: { userId, status: "active", deletedAt: null },
    },
  });
}

export async function findNextGeneralQuestion(
  activityId: string,
  lastQuestionId: string | null,
): Promise<Question | null> {
  const now = new Date();
  const baseWhere = {
    activityId,
    deletedAt: null,
    ...(lastQuestionId ? { NOT: { id: lastQuestionId } } : {}),
  };

  const sm2Eligible = await prisma.question.findFirst({
    where: { ...baseWhere, nextRevisionAt: { lte: now } },
    orderBy: { nextRevisionAt: "asc" },
  });
  if (sm2Eligible) return sm2Eligible;

  const wrongOrPartial = await prisma.question.findFirst({
    where: { ...baseWhere, status: { in: ["wrong", "partial"] } },
    orderBy: { updatedAt: "asc" },
  });
  if (wrongOrPartial) return wrongOrPartial;

  return prisma.question.findFirst({
    where: baseWhere,
    orderBy: { updatedAt: "asc" },
  });
}

export async function findPendingQuestion(
  activityId: string,
): Promise<Question | null> {
  return prisma.question.findFirst({
    where: { activityId, status: "pending", deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
}

export async function countQuestionFormatsByActivity(
  activityId: string,
  userId: string,
): Promise<Partial<Record<QuestionFormat, number>>> {
  const groups = await prisma.question.groupBy({
    by: ["questionFormat"],
    where: { activityId, userId, deletedAt: null },
    _count: { _all: true },
  });
  const counts: Partial<Record<QuestionFormat, number>> = {};
  for (const group of groups) {
    if (group.questionFormat) counts[group.questionFormat] = group._count._all;
  }
  return counts;
}

export async function findQuestionById(id: string): Promise<Question | null> {
  return prisma.question.findFirst({ where: { id, deletedAt: null } });
}

export async function findLatestUnansweredQuestion(
  activityId: string,
): Promise<Question | null> {
  return prisma.question.findFirst({
    where: { activityId, status: null, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function findUserQuestionById(
  id: string,
  userId: string,
): Promise<Pick<Question, "id" | "answeredAt" | "rating"> | null> {
  return prisma.question.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true, answeredAt: true, rating: true },
  });
}

export async function saveQuestionRating(params: {
  id: string;
  userId: string;
  rating: boolean;
  ratingKind: QuestionRatingKind | null;
  ratingNote: string | null;
  regenerate: boolean;
}): Promise<boolean> {
  const { id, userId, ...data } = params;
  const { count } = await prisma.question.updateMany({
    where: { id, userId, ratedAt: null, deletedAt: null },
    data: { ...data, ratedAt: new Date() },
  });
  return count > 0;
}

export async function findFeedbackTranslationsByIds(
  ids: string[],
): Promise<Pick<Question, "id" | "feedbackTranslation">[]> {
  return prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, feedbackTranslation: true },
  });
}

export async function countQuestionsEligibleForAudioCleanup(
  threshold: Date,
): Promise<number> {
  return prisma.question.count({
    where: {
      deletedAt: null,
      OR: [
        { questionAudioMediaId: { not: null } },
        { feedbackAudioMediaId: { not: null } },
        { answerAudioMediaId: { not: null } },
      ],
      activity: {
        status: { in: ["archived", "cancelled"] },
        statusUpdatedAt: { lte: threshold },
        deletedAt: null,
      },
    },
  });
}

export async function findQuestionsEligibleForAudioCleanup(
  threshold: Date,
  limit: number,
): Promise<Question[]> {
  return prisma.question.findMany({
    where: {
      deletedAt: null,
      OR: [
        { questionAudioMediaId: { not: null } },
        { feedbackAudioMediaId: { not: null } },
        { answerAudioMediaId: { not: null } },
      ],
      activity: {
        status: { in: ["archived", "cancelled"] },
        statusUpdatedAt: { lte: threshold },
        deletedAt: null,
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export async function updateQuestion(
  id: string,
  data: {
    status?: Exclude<QuestionStatus, "pending">;
    answer?: string;
    answeredAt?: Date;
    attemptCount?: number;
    revisionCount?: number;
    wrongCount?: number;
    answerType?: AnswerType | null;
    questionType?: QuestionType;
    questionOptions?: string[];
    easeFactor?: number;
    interval?: number;
    nextRevisionAt?: Date;
    provider?: AiProvider;
    model?: string;
    evalTip?: string | null;
    evalTipClass?: EvalTipClass | null;
    feedbackText?: string | null;
    feedbackTranslation?: string | null;
    questionAudioMediaId?: string | null;
    feedbackAudioMediaId?: string | null;
    answerAudioMediaId?: string | null;
    metadata?: Record<string, unknown>;
    score?: number;
  },
): Promise<void> {
  await prisma.question.update({
    where: { id },
    data: {
      ...data,
      metadata:
        data.metadata !== undefined
          ? (data.metadata as Prisma.InputJsonObject)
          : undefined,
    },
  });
}

const CLEARED_RATING = {
  ratedAt: null,
  rating: null,
  ratingKind: null,
  ratingNote: null,
};

function rewriteQuestionContent(
  tx: Prisma.TransactionClient,
  id: string,
  activityId: string,
  content: RegeneratedQuestionContent,
): Promise<Question> {
  return tx.question.update({
    where: { id },
    data: {
      status: "pending",
      activityId,
      question: content.question,
      answerKeys: content.answerKeys,
      questionFormat: content.questionFormat,
      questionOptions: content.questionOptions ?? [],
      questionImageMediaId: content.questionImageMediaId ?? null,
      questionImageDescription: content.questionImageDescription ?? null,
      questionAudioMediaId: content.questionAudioMediaId ?? null,
      metadata: content.metadata as Prisma.InputJsonObject,
      answer: null,
      answerType: null,
      answeredAt: null,
      provider: null,
      model: null,
      evalTip: null,
      evalTipClass: null,
      feedbackText: null,
      feedbackTranslation: null,
      feedbackAudioMediaId: null,
      answerAudioMediaId: null,
      ...CLEARED_RATING,
      regenerate: false,
    },
  });
}

// Com connection_limit=1 a transacao segura a unica conexao: dentro do callback
// tudo usa tx, porque o prisma global ficaria esperando essa conexao ate o timeout.
// Por isso o conteudo novo chega pronto: a geracao leva segundos e fica fora.
export async function reopenQuestion(params: {
  id: string;
  userId: string;
  activityId: string;
  newContent?: RegeneratedQuestionContent;
}): Promise<Question> {
  const { id, userId, activityId, newContent } = params;
  return prisma.$transaction(async (tx) => {
    const current = await tx.question.findFirst({ where: { id, userId } });
    if (current?.answeredAt) {
      await tx.questionSnapshot.create({
        data: {
          questionId: id,
          userId,
          activityId: current.activityId,
          answeredAt: current.answeredAt,
          questionFormat: current.questionFormat,
          status: current.status,
          rating: current.rating,
          snapshotData: JSON.parse(
            JSON.stringify(current),
          ) as Prisma.InputJsonObject,
        },
      });
    }
    if (newContent) {
      return rewriteQuestionContent(tx, id, activityId, newContent);
    }
    return tx.question.update({
      where: { id },
      data: {
        status: "pending",
        activityId,
        answeredAt: null,
        ...CLEARED_RATING,
      },
    });
  });
}
