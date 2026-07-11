import { QuestionFormat } from "../lib/prisma";

const VOCABULARY_FORMATS: QuestionFormat[] = [
  QuestionFormat.gap_fill,
  QuestionFormat.recall,
  QuestionFormat.recall_inverted,
  QuestionFormat.scenario,
  QuestionFormat.choice,
];

export function pickNextFormat(lastFormat: QuestionFormat | null): QuestionFormat {
  if (lastFormat === null) return QuestionFormat.gap_fill;
  const remaining = VOCABULARY_FORMATS.filter((f) => f !== lastFormat);
  return remaining[Math.floor(Math.random() * remaining.length)];
}
