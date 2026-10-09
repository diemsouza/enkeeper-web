import { QuestionFormat } from "../lib/prisma";
import { AUDIO_QUESTION_FORMATS } from "../lib/constants";

// image_recognition fica no meio, o mais longe possivel de choice (distancia 3
// na ordem linear e circular): os dois sao de escolha e nao saem em sequencia.
// Os formatos de audio vao no fim, fora da familia de escolha.
const VOCABULARY_FORMATS: QuestionFormat[] = [
  QuestionFormat.gap_fill,
  QuestionFormat.recall,
  QuestionFormat.image_recognition,
  QuestionFormat.recall_inverted,
  QuestionFormat.scenario,
  QuestionFormat.choice,
  QuestionFormat.audio_transcription,
  QuestionFormat.audio_translation,
];

const CHOICE_FAMILY: QuestionFormat[] = [
  QuestionFormat.choice,
  QuestionFormat.image_recognition,
];

// Formatos de audio formam uma familia: nunca dois em sequencia.
const AUDIO_FAMILY: QuestionFormat[] = AUDIO_QUESTION_FORMATS;

export type FormatCounts = Partial<Record<QuestionFormat, number>>;

type PickOptions = {
  canUseImage: boolean;
  canUseAudio: boolean;
  formatCounts: FormatCounts;
};

function getExcludedFormats(
  lastFormat: QuestionFormat,
  options: Omit<PickOptions, "formatCounts">,
): QuestionFormat[] {
  const family = [CHOICE_FAMILY, AUDIO_FAMILY].find((f) =>
    f.includes(lastFormat),
  );
  const excluded = family ? [...family] : [lastFormat];
  if (!options.canUseImage) excluded.push(QuestionFormat.image_recognition);
  if (!options.canUseAudio) excluded.push(...AUDIO_FAMILY);
  return excluded;
}

// Rotacao balanceada: sorteia so entre os formatos menos usados na atividade.
// Formato de midia que cai em fallback (item nao ilustravel, falha de imagem
// ou de audio) nao conta, entao continua com prioridade nas perguntas seguintes.
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
  options: PickOptions,
): QuestionFormat {
  if (lastFormat === null) return QuestionFormat.gap_fill;
  const excluded = getExcludedFormats(lastFormat, options);
  const remaining = VOCABULARY_FORMATS.filter((f) => !excluded.includes(f));
  return pickLeastUsed(remaining, options.formatCounts);
}
