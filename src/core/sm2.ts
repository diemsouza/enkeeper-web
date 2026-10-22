export function calcSm2(
  currentEaseFactor: number,
  currentInterval: number,
  currentNextRevisionAt: Date | null,
  status: "right" | "partial" | "wrong",
  isAlternativeAnswer: boolean,
): { easeFactor: number; interval: number; nextRevisionAt: Date } | null {
  const now = new Date();

  if (currentNextRevisionAt !== null && currentNextRevisionAt > now) {
    return null;
  }

  let easeFactor = currentEaseFactor;
  // Acerto com termo fora das answerKeys equivale ao q=4 do SM-2 classico:
  // o card avanca sem acelerar, porque o usuario nao usou o termo-alvo.
  if (status === "right") {
    easeFactor = currentEaseFactor + (isAlternativeAnswer ? 0 : 0.1);
  } else if (status === "partial") {
    easeFactor = currentEaseFactor - 0.15;
  } else {
    easeFactor = currentEaseFactor - 0.2;
  }
  easeFactor = Math.max(1.3, easeFactor);

  let interval: number;
  if (status === "wrong" || status === "partial") {
    interval = 1;
  } else {
    interval = Math.round(Math.min(Math.max(currentInterval, 1) * easeFactor, 3));
  }

  const nextRevisionAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return { easeFactor, interval, nextRevisionAt };
}
