import {
  Question,
  QuestionFormat,
  QuestionStatus,
  AnswerType,
  QuestionType,
  AiProvider,
  EvalTipClass,
  Prisma,
} from "../lib/prisma";
import { prisma } from "../lib/prisma";

export type CreateQuestionData = {
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
};

export async function createQuestions(
  activityId: string,
  sectionId: string,
  questions: CreateQuestionData[],
): Promise<void> {
  await prisma.question.createMany({
    data: questions.map((q) => ({
      activityId,
      sectionId,
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
    orderBy: [{ section: { order: "asc" } }, { createdAt: "asc" }],
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

export async function findQuestionById(id: string): Promise<Question | null> {
  return prisma.question.findFirst({ where: { id, deletedAt: null } });
}

export async function countQuestionsForSection(
  sectionId: string,
): Promise<number> {
  return prisma.question.count({ where: { sectionId, deletedAt: null } });
}

export async function findLatestUnansweredInSection(
  sectionId: string,
): Promise<Question | null> {
  return prisma.question.findFirst({
    where: { sectionId, status: null, deletedAt: null },
    orderBy: { createdAt: "desc" },
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
    status?: QuestionStatus;
    answer?: string;
    attemptCount?: number;
    revisionCount?: number;
    activityId?: string;
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
