import {
  MIN_WORDS,
  MIN_UNIQUE_WORDS,
  MIN_UNIQUE_RATIO,
} from "../lib/constants";

type ValidationResult = {
  isValid: boolean;
  invalidReason?: string;
};

const REASON_TRANSLATIONS: Record<string, string> = {
  too_short: "O conteúdo é muito curto.",
  too_repetitive: "O conteúdo tem palavras demais repetidas.",
};

export function formatInvalidContentMessage(
  invalidReason?: string | null,
): string {
  const translated = invalidReason
    ? (REASON_TRANSLATIONS[invalidReason] ?? invalidReason)
    : null;
  const reasonPart = translated ? `${translated} ` : "";
  return `Não consegui usar esse material. ${reasonPart}Funciona melhor com lista de palavras, texto corrido ou exercícios em inglês. Envie novamente ou tenta outro formato.`;
}

export function validateContent(text: string): ValidationResult {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length < MIN_WORDS) {
    return { isValid: false, invalidReason: "too_short" };
  }

  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));

  if (uniqueWords.size < MIN_UNIQUE_WORDS) {
    return { isValid: false, invalidReason: "too_repetitive" };
  }

  if (uniqueWords.size / words.length < MIN_UNIQUE_RATIO) {
    return { isValid: false, invalidReason: "too_repetitive" };
  }

  return { isValid: true };
}
