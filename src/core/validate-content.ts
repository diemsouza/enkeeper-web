import { MIN_WORDS, MIN_UNIQUE_WORDS, MIN_UNIQUE_RATIO } from "../lib/constants";

type ValidationResult = {
  isValid: boolean;
  invalidReason?: string;
};

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
