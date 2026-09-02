import { Activity } from "../lib/prisma";
import {
  ActivitySummaryData,
  findActivityForSummary,
  findArchivedActivityBefore,
  findCurrentActivityByUser,
  findLatestArchivedActivity,
  updateActivity,
  updateActivityScore,
} from "../repo/activities.repo";
import {
  findQuestionById,
  findQuestionScoresByActivity,
  updateQuestion,
} from "../repo/questions.repo";
import {
  countActivityAudios,
  findUserMessageDatesByActivity,
} from "../repo/messages.repo";
import {
  computeElapsedDays,
  countActiveDays,
  toPentagonSeries,
} from "../core/activity-chart-stats";
import { PentagonSeries } from "../core/pentagon-chart";
import { buildGaugeChartImage, buildPentagonChartImage } from "./chart-service";
import {
  formatActivitySuggestion,
  formatPreviousActivitySummary,
  formatRoundCompletedFallback,
  formatRoundCompletedSummary,
} from "../core/formatters";
import { AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC } from "../lib/constants";
import {
  ACTIVITY_ELIGIBLE_SCORE,
  computeActivityScore,
  computeQuestionScore,
  ScoreMetadata,
} from "../lib/activity-score";
import { delay } from "../lib/utils";
import { MessageChannel } from "../types/message-channel";
import { sendAndSaveMessage } from "./message-sender-service";

export async function archiveOrCancelActivity(
  activity: Activity,
  userId: string,
): Promise<void> {
  if (activity.status !== "active" && activity.status !== "paused") return;
  const status = activity.interactionCount > 0 ? "archived" : "cancelled";
  await updateActivity(activity.id, userId, {
    status,
    statusUpdatedAt: new Date(),
    intensiveUntil: null,
  });
}

export async function switchToActivity(
  userId: string,
  target: Activity,
): Promise<void> {
  const current = await findCurrentActivityByUser(userId);
  if (current && current.id !== target.id) {
    await archiveOrCancelActivity(current, userId);
  }
  await updateActivity(target.id, userId, {
    status: "active",
    statusUpdatedAt: new Date(),
    pausedAt: null,
    intensiveUntil: null,
  });
}

export type SummaryMessage = { text: string; imagePath?: string };

// Mesmo número da linha de leitura da Seção 1 ("menos de 5 respondidas"): com
// menos que isso o chart não tem valor de leitura, manda só texto.
const MIN_CHART_VOLUME = 5;

async function resolveActivityScore(
  activityId: string,
  persist: boolean,
): Promise<number> {
  const scores = await findQuestionScoresByActivity(activityId);
  const score = computeActivityScore(scores.map((q) => q.score));
  if (persist) await updateActivityScore(activityId, score);
  return score;
}

function buildActivityPentagonSeries(
  data: ActivitySummaryData,
  score: number,
  audios: { sent: number; played: number },
  dates: Date[],
): PentagonSeries {
  const right = data.questions.filter((q) => q.status === "right").length;
  const responses = data.questions.length;
  const reviews = data.questions.filter((q) => q.attemptCount > 1).length;

  return toPentagonSeries({
    responses,
    right,
    reviews,
    audiosSent: audios.sent,
    audiosPlayed: audios.played,
    activeDays: countActiveDays(dates),
    elapsedDays: computeElapsedDays(data.createdAt, data.lastInteractionAt),
    questionLimit: data.questionLimit,
    score,
  });
}

async function buildActivitySwapChartImage(
  userId: string,
  current: ActivitySummaryData,
  currentScore: number,
): Promise<string | null> {
  // Nunca propaga: falha na coleta de dados ou na geração degrada pra texto
  // puro, igual ao áudio de feedback (Seção 6.1).
  try {
    // Dado insuficiente: com poucas respostas o gráfico não tem leitura.
    if (current.questions.length < MIN_CHART_VOLUME) return null;

    const [audios, dates] = await Promise.all([
      countActivityAudios(current.id),
      findUserMessageDatesByActivity(current.id),
    ]);
    // Sem áudio no ciclo, a métrica de escuta não existe pro usuário: só texto.
    if (audios.sent === 0) return null;

    const series = buildActivityPentagonSeries(
      current,
      currentScore,
      audios,
      dates,
    );

    const previous = await findArchivedActivityBefore(
      userId,
      current.statusUpdatedAt,
      current.id,
    );
    let previousSeries: PentagonSeries | undefined;
    if (previous && previous.questions.length > 0) {
      const [prevAudios, prevDates, prevScore] = await Promise.all([
        countActivityAudios(previous.id),
        findUserMessageDatesByActivity(previous.id),
        resolveActivityScore(previous.id, false),
      ]);
      previousSeries = buildActivityPentagonSeries(
        previous,
        prevScore,
        prevAudios,
        prevDates,
      );
    }

    return await buildPentagonChartImage(current.id, series, previousSeries);
  } catch (err) {
    console.error("[activity-service] pentagon chart failed:", err);
    return null;
  }
}

async function buildRoundCompletedChartImage(
  activityId: string,
  score: number,
): Promise<string | null> {
  try {
    return await buildGaugeChartImage(activityId, score);
  } catch (err) {
    console.error("[activity-service] gauge chart failed:", err);
    return null;
  }
}

export async function buildPreviousActivitySummary(
  userId: string,
  opts: { activityId?: string; ignoreSummaryGuard?: boolean } = {},
): Promise<SummaryMessage | null> {
  try {
    const data = opts.activityId
      ? await findActivityForSummary(opts.activityId, userId)
      : await findLatestArchivedActivity(userId);
    if (!data) return null;
    // Guarda once-only na própria linha carregada, robusta ao fluxo de
    // `retomar` (que arquiva sem gravar summary).
    if (!opts.ignoreSummaryGuard && data.summary?.trim()) return null;
    if (data.questions.length === 0) return null;

    const right = data.questions.filter((q) => q.status === "right").length;
    const partial = data.questions.filter((q) => q.status === "partial").length;
    const wrong = data.questions.filter((q) => q.status === "wrong").length;
    const responses = right + partial + wrong;
    const reviews = data.questions.filter((q) => q.attemptCount > 1).length;
    if (responses === 0) return null;

    const ref = data.lastInteractionAt ?? data.createdAt;
    const diffHours = Math.floor(
      (ref.getTime() - data.createdAt.getTime()) / (1000 * 60 * 60),
    );
    const days = Math.floor(diffHours / 24);
    const period =
      diffHours >= 24
        ? `${days} dia${days > 1 ? "s" : ""}`
        : diffHours >= 1
          ? `${diffHours} hora${diffHours > 1 ? "s" : ""}`
          : `alguns minutos`;

    const score = await resolveActivityScore(data.id, !opts.ignoreSummaryGuard);

    const text = formatPreviousActivitySummary({
      activityTitle: data.title ?? "Sem título",
      questionCount: data.questionLimit,
      right,
      partial,
      wrong,
      responses,
      reviews,
      period,
      score,
    }).text;

    if (!opts.ignoreSummaryGuard) {
      await updateActivity(data.id, userId, { summary: text });
    }

    const imagePath = await buildActivitySwapChartImage(userId, data, score);
    return imagePath ? { text, imagePath } : { text };
  } catch (err) {
    console.error("[activity-service] previous activity summary failed:", err);
    return null;
  }
}

export async function buildRoundCompletedSummary(
  activityId: string,
): Promise<SummaryMessage> {
  try {
    const data = await findActivityForSummary(activityId);
    if (!data) return { text: formatRoundCompletedFallback().text };
    if (data.questions.length === 0) {
      return { text: formatRoundCompletedFallback().text };
    }

    const right = data.questions.filter((q) => q.status === "right").length;
    const responses = data.questions.length;
    if (responses === 0) return { text: formatRoundCompletedFallback().text };

    const score = await resolveActivityScore(activityId, true);

    const text = formatRoundCompletedSummary({
      questionCount: data.questionLimit,
      right,
      responses,
      score,
    }).text;

    const imagePath =
      data.questionCount >= MIN_CHART_VOLUME
        ? await buildRoundCompletedChartImage(activityId, score)
        : null;
    return imagePath ? { text, imagePath } : { text };
  } catch {
    return { text: formatRoundCompletedFallback().text };
  }
}

export async function isActivitySuggestionEligible(
  activityId: string,
): Promise<boolean> {
  const questions = await findQuestionScoresByActivity(activityId);

  if (questions.length === 0) {
    console.log(
      `[isActivitySuggestionEligible] activityId=${activityId} questions=0 eligible=false reason=no_questions`,
    );
    return false;
  }

  const mean = computeActivityScore(questions.map((q) => q.score));
  const eligible = mean >= ACTIVITY_ELIGIBLE_SCORE;
  const reason = eligible ? "eligible" : "below_threshold";

  await updateActivityScore(activityId, mean);

  console.log(
    `[isActivitySuggestionEligible] activityId=${activityId} ` +
      `questions=${questions.length} mean_score=${mean.toFixed(2)}/${ACTIVITY_ELIGIBLE_SCORE} ` +
      `eligible=${eligible} reason=${reason}`,
  );

  return eligible;
}

export async function recordFeedbackAudioPlayed(
  questionId: string,
): Promise<void> {
  const question = await findQuestionById(questionId);
  if (!question) return;

  const current = (question.metadata as ScoreMetadata | null) ?? {};
  const metadata: ScoreMetadata = {
    ...current,
    audioPlayedCount: (current.audioPlayedCount ?? 0) + 1,
  };

  await updateQuestion(questionId, {
    metadata,
    score: computeQuestionScore(metadata),
  });
}

type MaybeSendActivitySuggestionParams = {
  activity: Activity;
  userId: string;
  userChannelId: string;
  isLastAnswerCorrect: boolean;
  channel: MessageChannel;
  to: string;
  today: Date;
};

export async function maybeSendActivitySuggestion(
  params: MaybeSendActivitySuggestionParams,
): Promise<void> {
  const {
    activity,
    userId,
    userChannelId,
    isLastAnswerCorrect,
    channel,
    to,
    today,
  } = params;
  if (!isLastAnswerCorrect) return;
  if (!activity.roundCompleted) return;
  if (activity.activitySuggestedAt !== null) return;

  const eligible = await isActivitySuggestionEligible(activity.id);
  if (!eligible) return;

  await delay(AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC);
  const message = formatActivitySuggestion();
  await sendAndSaveMessage({
    channel,
    to,
    userId,
    userChannelId,
    activityId: activity.id,
    message,
    intent: "activity_suggestion",
    today,
  });

  await updateActivity(activity.id, userId, {
    activitySuggestedAt: new Date(),
  });
}
