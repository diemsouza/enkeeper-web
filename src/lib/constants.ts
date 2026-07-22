export const LOCALE_COOKIE_NAME = "zn_locale";
export const MIN_WORDS = 50;
export const MIN_UNIQUE_WORDS = 30;
export const MIN_UNIQUE_RATIO = 0.3;
export const NEXT_MESSAGE_INTERVAL_MIN = 60;
export const FIRST_MESSAGE_INTERVAL_MIN = 2;
export const LOCALES = ["pt-BR", "en-US"];
export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_CURRENCY = "BRL";
export const WHATSAPP_NUMBER = "551153069000";
export const INTENSIVE_UNTIL_MIN = 15;
export const DAILY_PRACTICE_LIMIT = 60;
export const CADENCE_RESERVE = 24;
export const INTENSIVE_LIMIT = 60 - 24; // 36
export const TRIAL_DAYS = 3;
export const MAX_ACTIVITIES_PER_DAY = 5;
export const MAX_DOC_ITEMS_PER_DOC = 3;
export const DOC_BUFFER_DELAY_SEC = 45;
export const DOC_PENDING_TIMEOUT_MS = 5 * 60 * 1000;
export const DOC_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
export const ONBOARDING_MESSAGE_INTERVAL_SEC = 2;
export const DEFAULT_MESSAGE_INTERVAL_SEC = 3;
export const AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC = 8;
export const NUDGE_STEPS = [
  "h4",
  "h12",
  "h23",
  "d2",
  "d3",
  "d7",
  "d14",
] as const;
export type NudgeStep = (typeof NUDGE_STEPS)[number];

export const NUDGE_THRESHOLDS_MS: Record<NudgeStep, number> = {
  h4: 4 * 60 * 60 * 1000, // 4 hours porque após 1h usuário recebe nova pergunta, isso vai dar 3h depois da ultima msg (esperado)
  h12: 12 * 60 * 60 * 1000,
  h23: 23 * 60 * 60 * 1000,
  d2: 2 * 24 * 60 * 60 * 1000,
  d3: 3 * 24 * 60 * 60 * 1000,
  d7: 7 * 24 * 60 * 60 * 1000,
  d14: 14 * 24 * 60 * 60 * 1000,
};

export function getNextNudgeStep(current: string | null): NudgeStep | null {
  if (!current) return "h4";
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

export const MESSAGE_SUPPRESSION_SEC = 10;
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1000;

export const COMMAND_TIMEOUT_MIN = 5;

export const CONTENT_GROUPS = [
  { id: "work", label: "Mercado de Trabalho" },
  { id: "travel", label: "Viagens Internacionais" },
  { id: "education", label: "Educação e Intercâmbio" },
  { id: "daily_life", label: "Dia a Dia e Lazer" },
] as const;
export type ContentGroupId = (typeof CONTENT_GROUPS)[number]["id"];

export const CONTENT_SUBGROUPS = [
  { id: "words", label: "Palavras" },
  { id: "actions", label: "Ações" },
  { id: "expressions", label: "Expressões" },
] as const;
export type ContentSubgroupId = (typeof CONTENT_SUBGROUPS)[number]["id"];

export function getContentGroupLabel(id: string): string {
  return CONTENT_GROUPS.find((g) => g.id === id)?.label ?? id;
}

export function getContentSubgroupLabel(id: string): string {
  return CONTENT_SUBGROUPS.find((g) => g.id === id)?.label ?? id;
}
