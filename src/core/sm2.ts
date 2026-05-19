export function calcSm2(
  currentEaseFactor: number,
  currentInterval: number,
  currentNextRevisionAt: Date | null,
  status: "right" | "partial" | "wrong",
): { easeFactor: number; interval: number; nextRevisionAt: Date } | null {
  const now = new Date();

  if (currentNextRevisionAt !== null && currentNextRevisionAt > now) {
    return null;
  }

  let easeFactor = currentEaseFactor;
  if (status === "right") {
    easeFactor = currentEaseFactor + 0.1;
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
