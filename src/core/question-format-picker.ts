import { QuestionFormat } from "../lib/prisma";
import {
  AUDIO_QUESTION_FORMATS,
  IMAGE_QUESTION_FORMATS,
} from "../lib/constants";

// image_recognition fica longe de choice no array: os dois sao de escolha e
// nao saem em sequencia. Os formatos de audio vao no fim, fora da familia de
// escolha. image_transcription e resposta livre, sem familia.
const VOCABULARY_FORMATS: QuestionFormat[] = [
  QuestionFormat.gap_fill,
  QuestionFormat.recall,
  QuestionFormat.image_recognition,
  QuestionFormat.recall_inverted,
  QuestionFormat.scenario,
  QuestionFormat.image_transcription,
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
  if (!options.canUseImage) excluded.push(...IMAGE_QUESTION_FORMATS);
  if (!options.canUseAudio) excluded.push(...AUDIO_FAMILY);
  return excluded;
}

// Rotacao balanceada: sorteia so entre os formatos menos usados na atividade.
// A contagem soma as perguntas criadas e as tentativas de midia que cairam em
// fallback (mergeFormatCounts), para o formato que nao gera nao ser empurrado
// de novo a cada pergunta.
function pickLeastUsed(
  formats: QuestionFormat[],
  counts: FormatCounts,
): QuestionFormat {
  const minCount = Math.min(...formats.map((f) => counts[f] ?? 0));
  const leastUsed = formats.filter((f) => (counts[f] ?? 0) === minCount);
  return leastUsed[Math.floor(Math.random() * leastUsed.length)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// Tentativas de midia que cairam em fallback ficam em Activity.metadata.formatFallbacks.
export function parseFormatFallbacks(activityMetadata: unknown): FormatCounts {
  if (!isRecord(activityMetadata)) return {};
  const fallbacks = activityMetadata.formatFallbacks;
  if (!isRecord(fallbacks)) return {};
  const counts: FormatCounts = {};
  for (const [format, count] of Object.entries(fallbacks)) {
    if (typeof count === "number") counts[format as QuestionFormat] = count;
  }
  return counts;
}

export function mergeFormatCounts(
  questionCounts: FormatCounts,
  fallbackAttempts: FormatCounts,
): FormatCounts {
  const merged: FormatCounts = { ...questionCounts };
  for (const [format, count] of Object.entries(fallbackAttempts)) {
    const key = format as QuestionFormat;
    merged[key] = (merged[key] ?? 0) + (count ?? 0);
  }
  return merged;
}

export function pickNextFormat(
  lastFormat: QuestionFormat | null,
  options: PickOptions,
): QuestionFormat {
  if (lastFormat === null) return QuestionFormat.gap_fill;
  const excluded = getExcludedFormats(lastFormat, options);
  const remaining = VOCABULARY_FORMATS.filter((f) => !excluded.includes(f));
  // Sem outro formato possivel, repete o anterior em vez de travar a pergunta.
  if (remaining.length === 0) return lastFormat;
  return pickLeastUsed(remaining, options.formatCounts);
}
