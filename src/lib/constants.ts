export const LOCALE_COOKIE_NAME = "zn_locale";
export const MIN_DOC_CHARS = 300;
export const MIN_WORDS = 50;
export const MIN_UNIQUE_WORDS = 30;
export const MIN_UNIQUE_RATIO = 0.3;
export const NEXT_MESSAGE_INTERVAL_MIN = 60;
export const FIRST_MESSAGE_INTERVAL_MIN = 3;
export const LOCALES = ["pt-BR", "en-US"];
export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_CURRENCY = "BRL";
export const WHATSAPP_NUMBER = "551153069000";
export const INTENSIVE_UNTIL_MIN = 15;
export const TRIAL_DAYS = 1;
export const MAX_ACTIVITIES_PER_DAY = 5;
export const MAX_DOC_ITEMS_PER_DOC = 3;
export const DOC_BUFFER_DELAY_SEC = 45;
export const DOC_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
export const SEQUENCE_WA_MESSAGE_INTERVAL_SEC = 2;
export const NUDGE_STEPS = [
  "h3",
  "h12",
  "h23",
  "d2",
  "d3",
  "d7",
  "d14",
] as const;
export type NudgeStep = (typeof NUDGE_STEPS)[number];

export const NUDGE_THRESHOLDS_MS: Record<NudgeStep, number> = {
  h3: 3 * 60 * 60 * 1000,
  h12: 12 * 60 * 60 * 1000,
  h23: 23 * 60 * 60 * 1000,
  d2: 2 * 24 * 60 * 60 * 1000,
  d3: 3 * 24 * 60 * 60 * 1000,
  d7: 7 * 24 * 60 * 60 * 1000,
  d14: 14 * 24 * 60 * 60 * 1000,
};

export function getNextNudgeStep(current: string | null): NudgeStep | null {
  if (!current) return "h3";
  const idx = NUDGE_STEPS.indexOf(current as NudgeStep);
  return idx >= 0 && idx < NUDGE_STEPS.length - 1 ? NUDGE_STEPS[idx + 1] : null;
}

export function getEntryNudgeStep(elapsedMs: number): NudgeStep | null {
  let entry: NudgeStep | null = null;
  for (const step of NUDGE_STEPS) {
    if (elapsedMs >= NUDGE_THRESHOLDS_MS[step]) {
      entry = step;
    } else {
      break;
    }
  }
  return entry;
}

export const ANSWER_EMOJI = {
  right: "✅",
  partial: "⚠️",
  wrong: "❌",
} as const;
