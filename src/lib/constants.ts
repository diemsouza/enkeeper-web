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

export const DOMAINS = [
  { id: "work", label: "Mercado de Trabalho" },
  { id: "travel", label: "Viagens Internacionais" },
  { id: "education", label: "Educação e Intercâmbio" },
  { id: "daily_life", label: "Dia a Dia e Lazer" },
] as const;
export type DomainId = (typeof DOMAINS)[number]["id"];

export function getDomainLabel(id: string): string {
  return DOMAINS.find((g) => g.id === id)?.label ?? id;
}

export const TOPIC_SUGGESTIONS: Record<DomainId, string[]> = {
  work: [
    "Entrevista de emprego",
    "Reuniões e apresentações",
    "E-mails profissionais",
    "Currículo e LinkedIn",
    "Negociação e vendas",
  ],
  travel: [
    "Aeroporto e embarque",
    "Hospedagem e hotel",
    "Restaurante e pedidos",
    "Transporte e deslocamento",
    "Situações de emergência",
  ],
  education: [
    "Universidade e aulas",
    "Bolsas e processos seletivos",
    "Entrevista de intercâmbio",
    "Vida no campus",
    "Provas de proficiência",
  ],
  daily_life: [
    "Tarefas domésticas",
    "Compras e mercado",
    "Redes sociais e streaming",
    "Encontros e vida social",
    "Esportes e hobbies",
  ],
};

export type FocusCategory = "lexico" | "verbal" | "estrutural";

export const FOCUS_ENUM = [
  {
    key: "vocabulary",
    labelPt: "Vocabulário geral",
    category: "lexico",
    aliases: ["vocabulário", "palavras", "vocabulary", "words"],
  },
  {
    key: "nouns",
    labelPt: "Substantivos",
    category: "lexico",
    aliases: ["substantivo", "substantivos", "noun", "nouns"],
  },
  {
    key: "adjectives",
    labelPt: "Adjetivos",
    category: "lexico",
    aliases: ["adjetivo", "adjetivos", "adjective", "adjectives"],
  },
  {
    key: "phrasal_verbs",
    labelPt: "Phrasal verbs",
    category: "lexico",
    aliases: ["verbos frasais", "phrasal verb"],
  },
  {
    key: "connectors",
    labelPt: "Conectores",
    category: "lexico",
    aliases: ["conectivos", "linking words", "connectors"],
  },
  {
    key: "collocations",
    labelPt: "Combinações de palavras",
    category: "lexico",
    aliases: ["collocations", "combinações"],
  },
  {
    key: "expressions",
    labelPt: "Expressões",
    category: "lexico",
    aliases: ["expressões", "idioms", "expression"],
  },
  {
    key: "to_be",
    labelPt: "Verbo To Be",
    category: "verbal",
    aliases: ["to be", "verbo ser/estar"],
  },
  {
    key: "present_simple",
    labelPt: "Presente simples",
    category: "verbal",
    aliases: ["present simple", "presente"],
  },
  {
    key: "present_continuous",
    labelPt: "Presente contínuo (-ing)",
    category: "verbal",
    aliases: ["gerúndio", "ing", "present continuous"],
  },
  {
    key: "past_simple",
    labelPt: "Verbos no passado",
    category: "verbal",
    aliases: ["passado", "past", "simple past"],
  },
  {
    key: "future",
    labelPt: "Futuro",
    category: "verbal",
    aliases: ["futuro", "future", "will", "going to"],
  },
  {
    key: "present_perfect",
    labelPt: "Presente perfeito",
    category: "verbal",
    aliases: ["present perfect", "have been"],
  },
  {
    key: "modals",
    labelPt: "Verbos modais",
    category: "verbal",
    aliases: ["modal", "can", "could", "should", "must"],
  },
  {
    key: "conditionals",
    labelPt: "Condicionais",
    category: "verbal",
    aliases: ["condicional", "if", "conditional"],
  },
  {
    key: "questions",
    labelPt: "Perguntas",
    category: "estrutural",
    aliases: ["perguntas", "questions", "question form"],
  },
  {
    key: "negation",
    labelPt: "Negação",
    category: "estrutural",
    aliases: ["negativa", "negation", "not"],
  },
  {
    key: "comparatives",
    labelPt: "Comparativos e superlativos",
    category: "estrutural",
    aliases: ["comparativo", "superlativo", "comparative"],
  },
  {
    key: "prepositions",
    labelPt: "Preposições",
    category: "estrutural",
    aliases: ["preposição", "preposition", "in on at"],
  },
  {
    key: "articles",
    labelPt: "Artigos",
    category: "estrutural",
    aliases: ["artigo", "a an the", "article"],
  },
  {
    key: "plurals",
    labelPt: "Plural",
    category: "estrutural",
    aliases: ["plural", "plurais"],
  },
  {
    key: "quantifiers",
    labelPt: "Quantificadores",
    category: "estrutural",
    aliases: ["quantificador", "some any much many"],
  },
  {
    key: "possessives",
    labelPt: "Possessivos",
    category: "estrutural",
    aliases: ["possessivo", "possessive", "my your his"],
  },
] as const;
export type FocusKey = (typeof FOCUS_ENUM)[number]["key"];
