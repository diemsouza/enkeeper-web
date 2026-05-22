import {
  Question,
  QuestionFormat,
  QuestionStatus,
  AnswerType,
  QuestionType,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

type CreateQuestionData = {
  question: string;
  answerKeys: string[];
  questionFormat?: QuestionFormat;
  questionOptions?: string[];
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
    })),
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

export async function hasWrongOrPartial(docId: string): Promise<boolean> {
  const count = await prisma.question.count({
    where: {
      deletedAt: null,
      status: { in: ["wrong", "partial", "pending"] },
      activity: { docId, deletedAt: null },
    },
  });
  return count > 0;
}

export async function findPendingQuestion(
  activityId: string,
): Promise<Question | null> {
  return prisma.question.findFirst({
    where: { activityId, status: "pending", deletedAt: null },
    orderBy: { updatedAt: "desc" },
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
  },
): Promise<void> {
  await prisma.question.update({ where: { id }, data });
}
