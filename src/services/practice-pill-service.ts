import { startOfDay } from "date-fns";
import { Activity } from "../lib/prisma";
import {
  isPracticeLimitReached,
  isTurnInProgress,
  resolvePracticeActions,
  resolvePracticePillState,
  type PracticeActions,
  type PracticePillState,
} from "../core/practice-pill";
import { findCurrentActivityByUser } from "../repo/activities.repo";
import { getTodayUsage } from "../repo/daily-usage.repo";
import { findLastStudyMessage } from "../repo/messages.repo";
import {
  findNextGeneralQuestion,
  findPendingQuestion,
  findUserQuestionById,
} from "../repo/questions.repo";
import { findUserById } from "../repo/users.repo";

async function findTodayLimitReached(userId: string): Promise<boolean> {
  const usage = await getTodayUsage(userId, startOfDay(new Date()));
  return isPracticeLimitReached(
    usage?.practiceCount ?? 0,
    usage?.intensiveCount ?? 0,
  );
}

// Nada e salvo: atividade ativa, nenhuma pergunta pendente e a ultima mensagem
// de estudo e o feedback da ultima pergunta respondida.
export async function findPracticeActions(
  activity: Pick<
    Activity,
    "id" | "status" | "roundCompleted" | "lastQuestionId"
  >,
  userId: string,
): Promise<PracticeActions | null> {
  if (activity.status !== "active") return null;
  if (await findPendingQuestion(activity.id)) return null;

  const lastStudy = await findLastStudyMessage(userId, activity.id);
  if (!lastStudy?.questionId || lastStudy.intent === "practice_question") {
    return null;
  }
  const question = await findUserQuestionById(lastStudy.questionId, userId);
  if (!question?.answeredAt) return null;

  const hasNextQuestion =
    !activity.roundCompleted ||
    !!(await findNextGeneralQuestion(activity.id, activity.lastQuestionId));
  return resolvePracticeActions({
    question,
    isLimitReached: await findTodayLimitReached(userId),
    hasNextQuestion,
  });
}

export async function findPracticePillState(
  userId: string,
): Promise<PracticePillState> {
  const [activity, user, isLimitReached] = await Promise.all([
    findCurrentActivityByUser(userId),
    findUserById(userId),
    findTodayLimitReached(userId),
  ]);
  const isTurnBusy = !!user && isTurnInProgress(user, Date.now());
  const practiceActions =
    activity && !isTurnBusy ? await findPracticeActions(activity, userId) : null;
  return resolvePracticePillState({
    hasActiveActivity: Boolean(activity),
    intensiveUntil: activity?.intensiveUntil ?? null,
    isLimitReached,
    practiceActions,
  });
}
