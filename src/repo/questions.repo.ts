import { Question, QuestionStatus } from "@prisma/client";
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

export async function findNextQuestion(docId: string): Promise<Question | null> {
  const nullFirst = await prisma.question.findFirst({
    where: { deletedAt: null, status: null, activity: { docId, deletedAt: null } },
    orderBy: { createdAt: "asc" },
  });
  if (nullFirst) return nullFirst;

  for (const status of ["wrong", "partial"] as QuestionStatus[]) {
    const question = await prisma.question.findFirst({
      where: { deletedAt: null, status, activity: { docId, deletedAt: null } },
      orderBy: { createdAt: "asc" },
    });
    if (question) return question;
  }

  return null;
}

export async function findPendingQuestion(activityId: string): Promise<Question | null> {
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
  },
): Promise<void> {
  await prisma.question.update({ where: { id }, data });
}

export async function allQuestionsRight(docId: string): Promise<boolean> {
  const base = { deletedAt: null, activity: { docId, deletedAt: null } };
  const total = await prisma.question.count({ where: base });
  if (total === 0) return false;
  const rightCount = await prisma.question.count({
    where: { ...base, status: "right" },
  });
  return rightCount === total;
}
