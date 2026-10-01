import { QuestionFormat } from "../lib/prisma";

// image_recognition fica no meio, o mais longe possivel de choice (distancia 3
// na ordem linear e circular): os dois sao de escolha e nao saem em sequencia.
const VOCABULARY_FORMATS: QuestionFormat[] = [
  QuestionFormat.gap_fill,
  QuestionFormat.recall,
  QuestionFormat.image_recognition,
  QuestionFormat.recall_inverted,
  QuestionFormat.scenario,
  QuestionFormat.choice,
];

const CHOICE_FAMILY: QuestionFormat[] = [
  QuestionFormat.choice,
  QuestionFormat.image_recognition,
];

function getExcludedFormats(
  lastFormat: QuestionFormat,
  canUseImage: boolean,
): QuestionFormat[] {
  const excluded = CHOICE_FAMILY.includes(lastFormat)
    ? [...CHOICE_FAMILY]
    : [lastFormat];
  if (!canUseImage) excluded.push(QuestionFormat.image_recognition);
  return excluded;
}

export function pickNextFormat(
  lastFormat: QuestionFormat | null,
  options: { canUseImage: boolean },
): QuestionFormat {
  if (lastFormat === null) return QuestionFormat.gap_fill;
  const excluded = getExcludedFormats(lastFormat, options.canUseImage);
  const remaining = VOCABULARY_FORMATS.filter((f) => !excluded.includes(f));
  return remaining[Math.floor(Math.random() * remaining.length)];
}
