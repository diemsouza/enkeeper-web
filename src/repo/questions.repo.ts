import {
  Question,
  QuestionStatus,
  AnswerType,
  QuestionType,
} from "@prisma/client";
import { prisma } from "../lib/prisma";

type CreateQuestionData = {
  question: string;
  answerKeys: string[];
};

export async function createQuestions(
  activityId: string,
  questions: CreateQuestionData[],
): Promise<void> {
  await prisma.question.createMany({
    data: questions.map((q) => ({
      activityId,
      question: q.question,
      answerKeys: q.answerKeys,
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
    orderBy: { updatedAt: "desc" },
  });
}

export async function findNextGeneralQuestion(
  docId: string,
  lastQuestionId: string | null,
): Promise<Question | null> {
  const baseWhere = {
    deletedAt: null,
    ...(lastQuestionId ? { NOT: { id: lastQuestionId } } : {}),
    activity: { docId, deletedAt: null },
  };
  const nullFirst = await prisma.question.findFirst({
    where: {
      ...baseWhere,
      OR: [{ status: null }, { NOT: { status: "right" } }],
    },
    orderBy: { updatedAt: "desc" },
  });
  if (nullFirst) return nullFirst;
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
    activityId?: string;
    wrongCount?: number;
    answerType?: AnswerType | null;
    questionType?: QuestionType;
  },
): Promise<void> {
  await prisma.question.update({ where: { id }, data });
}
