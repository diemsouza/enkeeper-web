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

export type FormatCounts = Partial<Record<QuestionFormat, number>>;

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

// Rotacao balanceada: sorteia so entre os formatos menos usados na atividade.
// image_recognition que cai em fallback (item nao ilustravel) nao conta, entao
// continua com prioridade nas perguntas seguintes ate sair.
function pickLeastUsed(
  formats: QuestionFormat[],
  counts: FormatCounts,
): QuestionFormat {
  const minCount = Math.min(...formats.map((f) => counts[f] ?? 0));
  const leastUsed = formats.filter((f) => (counts[f] ?? 0) === minCount);
  return leastUsed[Math.floor(Math.random() * leastUsed.length)];
}

export function pickNextFormat(
  lastFormat: QuestionFormat | null,
  options: { canUseImage: boolean; formatCounts: FormatCounts },
): QuestionFormat {
  if (lastFormat === null) return QuestionFormat.gap_fill;
  const excluded = getExcludedFormats(lastFormat, options.canUseImage);
  const remaining = VOCABULARY_FORMATS.filter((f) => !excluded.includes(f));
  return pickLeastUsed(remaining, options.formatCounts);
}
