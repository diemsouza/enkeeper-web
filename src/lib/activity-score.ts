import { AnswerType, Question } from "./prisma";

export type ScoreMetadata = {
  attemptCount?: number;
  wrongCount?: number;
  revisionCount?: number;
  rightCount?: number;
  partialCount?: number;
  audioRightCount?: number;
  audioWrongCount?: number;
  audioPartialCount?: number;
  audioPlayedCount?: number;
};

const W = { right: 4, partial: 2, wrong: 0 };
const P = { revision: 1, audioPlayed: 1 };
const AUDIO_ANSWER_BONUS = 1;
const PRACTICE_CAP = 2;
export const QUESTION_CAP = 10;
export const ACTIVITY_ELIGIBLE_SCORE = 7;

function omitZero(metadata: ScoreMetadata): ScoreMetadata {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => (value ?? 0) > 0),
  ) as ScoreMetadata;
}

export function updateScoreMetadata(
  question: Pick<
    Question,
    "attemptCount" | "wrongCount" | "revisionCount" | "metadata"
  >,
  status: "right" | "partial" | "wrong",
  answerType: AnswerType,
  isRealRevision: boolean,
): ScoreMetadata {
  const current = (question.metadata as ScoreMetadata | null) ?? {};
  const isWrongOrPartial = status === "wrong" || status === "partial";

  return omitZero({
    ...current,
    attemptCount: (current.attemptCount ?? question.attemptCount) + 1,
    wrongCount:
      (current.wrongCount ?? question.wrongCount) +
      (isWrongOrPartial ? 1 : 0),
    revisionCount:
      (current.revisionCount ?? question.revisionCount) +
      (isRealRevision ? 1 : 0),
    rightCount: (current.rightCount ?? 0) + (status === "right" ? 1 : 0),
    partialCount:
      (current.partialCount ?? 0) + (status === "partial" ? 1 : 0),
    audioRightCount:
      (current.audioRightCount ?? 0) +
      (status === "right" && answerType === "audio" ? 1 : 0),
    audioWrongCount:
      (current.audioWrongCount ?? 0) +
      (status === "wrong" && answerType === "audio" ? 1 : 0),
    audioPartialCount:
      (current.audioPartialCount ?? 0) +
      (status === "partial" && answerType === "audio" ? 1 : 0),
  });
}

export function computeActivityScore(questionScores: number[]): number {
  if (questionScores.length === 0) return 0;
  const sum = questionScores.reduce((acc, s) => acc + s, 0);
  return Math.trunc((sum / questionScores.length) * 10) / 10;
}

export function computeQuestionScore(metadata: ScoreMetadata): number {
  const quality =
    (metadata.rightCount ?? 0) * W.right +
    (metadata.partialCount ?? 0) * W.partial +
    (metadata.audioRightCount ?? 0) * AUDIO_ANSWER_BONUS;
  const practice = Math.min(
    PRACTICE_CAP,
    (metadata.revisionCount ?? 0) * P.revision +
      (metadata.audioPlayedCount ?? 0) * P.audioPlayed,
  );
  return Math.min(QUESTION_CAP, quality + practice);
}
