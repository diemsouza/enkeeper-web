import type {
  ChannelType,
  EvalTipClass,
  Level,
  QuestionFormat,
} from "./prisma";

export const EVAL_TIP_ALTERNATIVE_FORMATS: QuestionFormat[] = [
  "recall",
  "recall_inverted",
  "gap_fill",
  "scenario",
];

export const AUDIO_QUESTION_FORMATS: QuestionFormat[] = [
  "audio_transcription",
  "audio_translation",
];

const TEXT_EVAL_TIP_CLASSES: EvalTipClass[] = [
  "calque",
  "near_synonym",
  "structure",
  "collocation",
  "literal_idiom",
  "register",
  "alternative",
];

// Classes de dica que cada formato pode enviar; o prompt de avaliacao nao
// filtra por formato, o corte fica no codigo.
export const EVAL_TIP_CLASSES_BY_FORMAT: Record<QuestionFormat, EvalTipClass[]> =
  {
    gap_fill: TEXT_EVAL_TIP_CLASSES,
    recall: TEXT_EVAL_TIP_CLASSES,
    recall_inverted: TEXT_EVAL_TIP_CLASSES,
    scenario: TEXT_EVAL_TIP_CLASSES,
    choice: TEXT_EVAL_TIP_CLASSES,
    image_recognition: TEXT_EVAL_TIP_CLASSES,
    open_text: TEXT_EVAL_TIP_CLASSES,
    open_question: TEXT_EVAL_TIP_CLASSES,
    audio_transcription: ["homophone", "connected_speech"],
    audio_translation: [
      "calque",
      "near_synonym",
      "literal_idiom",
      "register",
      "structure",
    ],
  };

export const THEME_COLOR_LIGHT = "#ffffff";
export const THEME_COLOR_DARK = "#0a0a0a";

export const MIN_WORDS = 50;
export const MIN_UNIQUE_WORDS = 30;
export const MIN_UNIQUE_RATIO = 0.3;
export const NEXT_MESSAGE_INTERVAL_MIN = 60;
export const FIRST_MESSAGE_INTERVAL_MIN = 1;
export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_CURRENCY = "BRL";
export const DEFAULT_CHANNEL_TYPE: ChannelType = "web";
export const INTENSIVE_UNTIL_MIN = 15;
export const DAILY_PRACTICE_LIMIT = 60;
export const CADENCE_RESERVE = 24;
export const INTENSIVE_LIMIT = 60 - 24; // 36
export const TRIAL_DAYS = 7;
// Limpeza de midia pausada por decisao estrategica: audio e imagem compoem
// perguntas e sao reaproveitados na revisao. O processo segue no codigo
// (audio-cleanup-cron.service.ts), so nao roda ate ser reativado aqui.
export const MEDIA_CLEANUP_ENABLED = false;
export const AUDIO_CLEANUP_TTL_DAYS = 30;
export const IMAGE_CLEANUP_TTL_DAYS = 90;
export const AUDIO_CLEANUP_BATCH_LIMIT = 50;
export const AUDIO_CLEANUP_SUBBATCH_SIZE = 10;
export const SHORTLINK_CLEANUP_TTL_DAYS = 30;
export const MESSAGES_PAGE_SIZE = 30;
export const MEDIA_EXPIRES_IN_SEC = 60 * 60 * 4; // 4h de validade do link
export const MEDIA_INLINE_PARAM = "inline";
export const MEDIA_CACHE_SAFETY_MARGIN_SEC = 60 * 15; // 15min de folga

export const MEDIA_PARENT_TYPE = {
  QUESTION: "question",
  MESSAGE: "message",
  ACTIVITY: "activity",
} as const;
export type MediaParentType =
  (typeof MEDIA_PARENT_TYPE)[keyof typeof MEDIA_PARENT_TYPE];
export const MEDIA_SOURCE = {
  USER: "user",
  SYSTEM: "system",
} as const;
export type MediaSource = (typeof MEDIA_SOURCE)[keyof typeof MEDIA_SOURCE];
export const MEDIA_TYPE = {
  AUDIO: "audio",
  IMAGE: "image",
} as const;
export const QUESTION_IMAGE_FOLDER = "question-image";
export const QUESTION_IMAGE_EXTENSION = "jpg";
export const QUESTION_AUDIO_FOLDER = "question-audio";
export const FEEDBACK_AUDIO_FOLDER = "feedback-audio";
export const ANSWER_AUDIO_FOLDER = "answer-audio";
export const CHART_FOLDER = "chart";
export const OCR_IMAGE_FOLDER = "ocr-image";
export const MAX_ACTIVITIES_PER_DAY = 5;
export const MAX_DOC_ITEMS_PER_DOC = 3;
export const DOC_BUFFER_DELAY_SEC = 45;
export const DOC_PENDING_TIMEOUT_MS = 5 * 60 * 1000;
export const DOC_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
export const ONBOARDING_MESSAGE_INTERVAL_SEC = 2;
export const DEFAULT_MESSAGE_INTERVAL_SEC = 4;
export const AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC = 8;
export const TYPING_LEAD_MS = 2500;
// Abaixo disso a pausa sai em silencio: evita o indicador piscando.
export const MIN_DELAY_FOR_TYPING_MS = 4000;
export const REALTIME_MESSAGES_TOPIC_PREFIX = "messages-";
export const REALTIME_TYPING_EVENT = {
  START: "typing:start",
  STOP: "typing:stop",
} as const;
export const ANSWER_EMOJI = {
  right: "✅",
  partial: "⚠️",
  wrong: "❌",
} as const;

export const ACTIVITY_SUGGESTION_EMOJI = "🔄";

export const MESSAGE_SUPPRESSION_SEC = 10;
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1000;

export const COMMAND_TIMEOUT_MIN = 5;

export const DOMAINS = [
  { id: "daily_life", label: "Dia a Dia e Lazer" },
  { id: "travel", label: "Viagens Internacionais" },
  { id: "education", label: "Educação e Intercâmbio" },
  { id: "work", label: "Mercado de Trabalho" },
] as const;
export type DomainId = (typeof DOMAINS)[number]["id"];

export function getDomainLabel(id: string): string {
  return DOMAINS.find((g) => g.id === id)?.label ?? id;
}

export const LEVEL_OPTIONS: readonly { level: Level; label: string }[] = [
  { level: "basic", label: "Básico" },
  { level: "intermediate", label: "Intermediário" },
  { level: "advanced", label: "Avançado" },
];

export const PICK_SHORTCUTS = {
  FIRST_OPTION: { id: "first_option", label: "Primeira opção" },
  RANDOM: { id: "random", label: "Escolha para mim" },
} as const;

export const TOPIC_SUGGESTIONS_DISPLAY_COUNT = 5;

export const TOPIC_SUGGESTIONS: Record<DomainId, string[]> = {
  work: [
    "Entrevista de emprego",
    "Reuniões e apresentações",
    "Negociação e vendas",
    "Networking e eventos",
    "Liderança e gestão de time",
    "Feedback e avaliações",
    "E-mails profissionais",
    "Currículo e LinkedIn",
    "Trabalho remoto e ferramentas",
    "Termos técnicos da sua área",
  ],
  travel: [
    "Conversar com nativos",
    "Restaurante e pedidos",
    "Passeios e pontos turísticos",
    "Fazer amigos na viagem",
    "Compras e lojas",
    "Hospedagem e hotel",
    "Pedir informações e direções",
    "Aeroporto e embarque",
    "Transporte e deslocamento",
    "Situações de emergência",
  ],
  education: [
    "Intercâmbio e vida fora",
    "Fazer amigos internacionais",
    "Vida no campus",
    "Universidade e aulas",
    "Apresentar trabalhos e seminários",
    "Bolsas e processos seletivos",
    "Entrevista de intercâmbio",
    "Estágios e primeira experiência",
    "Moradia estudantil",
    "Provas de proficiência (TOEFL, IELTS)",
  ],
  daily_life: [
    "Séries, filmes e streaming",
    "Música e shows",
    "Games e cultura pop",
    "Comida e culinária",
    "Encontros e vida social",
    "Viagens e passeios",
    "Esportes e academia",
    "Redes sociais e internet",
    "Compras e mercado",
    "Rotina e casa",
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
  // TODO: delete (nao suportado por gerar perguntas dentro de blocos que ja sao perguntas)
  // {
  //   key: "questions",
  //   labelPt: "Perguntas",
  //   category: "estrutural",
  //   aliases: ["perguntas", "questions", "question form"],
  // },
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

// SITE representa "chegou via clique num link da landing para o WhatsApp"
// (ver core/user-source-classifier.ts) — hoje sem call site ativo, já que o
// webhook do WhatsApp não cria mais usuário. O login web usa
// core/attribution.ts (resolveSource) para resolver a origem a partir do
// cookie de atribuição, com os demais valores abaixo.
export const USER_SOURCE = {
  META_ADS: "meta_ads",
  GOOGLE_ADS: "google_ads",
  DIRECT: "direct",
  ORGANIC_SEARCH: "organic_search",
  REFERRAL: "referral",
  SITE: "site",
} as const;
export type UserSource = (typeof USER_SOURCE)[keyof typeof USER_SOURCE];

export const SITE_WHATSAPP_MESSAGE = "Oi, quero começar a praticar.";
export const SITE_MESSAGE_PATTERNS: string[] = [SITE_WHATSAPP_MESSAGE];

export const ATTRIBUTION_COOKIE_NAME = "fz_attribution";
export const ATTRIBUTION_COOKIE_MAX_AGE_DAYS = 30;
