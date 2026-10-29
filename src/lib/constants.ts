import type { EvalTipClass, Level, QuestionFormat } from "./prisma";
import type { ChannelType } from "../types/domain";
import type { CountryCode } from "libphonenumber-js";

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
export const EVAL_TIP_CLASSES_BY_FORMAT: Record<
  QuestionFormat,
  EvalTipClass[]
> = {
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
// Folga curta: cobre a cobrança de renovação, que a Stripe faz ~1-2h depois do
// fim do período, e falha de rede; mais que isso paga IA para quem não pagou.
export const PAYMENT_GRACE_DAYS = 1;
export const SITE_URL = "https://fluizer.com";
export const PAYMENT_PROVIDER = {
  STRIPE: "stripe",
} as const;
export const SUBSCRIPTION_INTERVAL = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;
export type SubscriptionInterval =
  (typeof SUBSCRIPTION_INTERVAL)[keyof typeof SUBSCRIPTION_INTERVAL];
export const SUBSCRIPTION_STATUS_CANCELED = "canceled";
export const PLANS_PATH = "/app/plans";
export const BILLING_PORTAL_PATH = "/api/app/billing/portal";
export const PAYMENT_SUCCESS_PARAM = "payment";
export const PAYMENT_SESSION_PARAM = "session_id";
export const SUBSCRIPTION_PRICE_BRL: Record<SubscriptionInterval, number> = {
  monthly: 29.9,
  yearly: 262.8,
};
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

export const SUPPORT_MESSAGE_MAX_LENGTH = 2000;

// Resposta por voz na web: limite unico de duracao, aviso antes do fim e
// gravacao minima (abaixo disso e descartada sem mensagem).
export const VOICE_MAX_SEC = 30;
export const VOICE_WARN_SEC = 20;
export const VOICE_MIN_MS = 1000;
export const VOICE_MAX_BYTES = 1024 * 1024;
// So formatos que o player toca: Ogg/Opus (nativo ou remuxado do WebM) e
// AAC em MP4 (Safari antes do 18.4).
export const VOICE_ACCEPTED_CONTENT_TYPES = ["audio/ogg", "audio/mp4"];
export const MAX_ACTIVITIES_PER_DAY = 5;
export const MAX_DOC_ITEMS_PER_DOC = 3;
export const MAX_ACTIVITY_FOCUS = 3;
export const CREATE_ACTIVITY_BUTTON_ID = "new_activity";
export const RETRY_NEW_ACTIVITY_BUTTON_ID = "retry_new_activity";
// Abaixo do limite de corpo de request da Vercel (4,5 MB).
export const MATERIAL_MAX_BYTES = 4 * 1024 * 1024;
export const MATERIAL_ACCEPT =
  "image/*,application/pdf,text/plain,text/markdown,.txt,.md";
export const ACTIVITY_TEXT_MAX_CHARS = 200;
// Janela em que um segundo pedido de criacao e recusado enquanto o primeiro gera.
export const ACTIVITY_CREATING_TTL_MS = 2 * 60 * 1000;
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

// Ordem de cada lista: das situacoes que mais engajam para as mais especificas.
export const TOPIC_SUGGESTIONS: Record<DomainId, string[]> = {
  daily_life: [
    "Comentar a última série que você assistiu",
    "Contar como foi seu fim de semana",
    "Recomendar um filme e explicar por quê",
    "Encontro com amigos no shopping",
    "Combinar um programa com amigos",
    "Falar sobre seus hobbies",
    "Contar uma história engraçada que aconteceu com você",
    "Conversar sobre futebol e outros esportes",
    "Falar sobre música e shows",
    "Falar sobre comidas e receitas favoritas",
    "Dar sua opinião sobre redes sociais",
    "Falar sobre sua família",
    "Falar sobre seu animal de estimação",
    "Comentar um jogo de videogame",
    "Planejar uma festa de aniversário",
    "Pedir delivery e resolver um problema no pedido",
    "Descrever sua rotina de manhã",
    "Conversar com o personal na academia",
    "Conversar com um vizinho novo",
    "Contar sobre sua infância",
  ],
  travel: [
    "Vocabulário para viagem para Orlando",
    "Imigração no aeroporto",
    "Pedir comida em restaurante e perguntar sobre ingredientes",
    "Fazer check-in no hotel e resolver um problema no quarto",
    "Pedir informação de caminho e transporte",
    "Fazer compras e pedir troca de produto",
    "Comprar ingresso para parques e atrações",
    "Pedir um carro por aplicativo e conversar com o motorista",
    "Conversar com outros turistas em um passeio",
    "Reservar mesa e pedir a conta",
    "Alugar um carro",
    "Remarcar um voo cancelado",
    "Resolver mala extraviada no aeroporto",
    "Fazer check-in com o anfitrião de uma hospedagem",
    "Comprar chip de celular e resolver a internet",
    "Fazer perguntas ao guia em um museu",
    "Negociar preço em uma feira",
    "Ir ao médico ou à farmácia no exterior",
    "Pedir ajuda depois de perder o passaporte",
    "Contar para os amigos como foi a viagem",
  ],
  education: [
    "Entrevista para visto de estudante",
    "Primeiro dia de aula na escola de idiomas",
    "Se apresentar para a turma",
    "Fazer amigos de outros países",
    "Conversar com a família anfitriã",
    "Explicar por que você escolheu esse intercâmbio",
    "Entrevista para bolsa de estudos",
    "Apresentar um trabalho em sala",
    "Participar de um debate em grupo",
    "Tirar dúvidas com o professor depois da aula",
    "Falar sobre a cultura do Brasil",
    "Procurar moradia e conversar com o proprietário",
    "Trabalho de meio período durante o intercâmbio",
    "Combinar um trabalho em grupo com colegas",
    "Abrir conta no banco morando fora",
    "Escrever um e-mail para o professor",
    "Pedir informação na secretaria da faculdade",
    "Pedir ajuda na biblioteca para uma pesquisa",
    "Resolver um problema com a matrícula",
    "Contar sua rotina de estudos",
  ],
  work: [
    "Negociar salário em uma entrevista",
    "Falar sobre seu currículo e suas experiências",
    "Se apresentar no primeiro dia de trabalho",
    "Pedir aumento ou promoção",
    "Daily com um time internacional",
    "Apresentar um projeto para o time",
    "Conversa rápida antes de começar uma reunião",
    "Pedir mais prazo para o chefe",
    "Dar e receber feedback de um colega",
    "Discordar de uma decisão com educação",
    "Entrevista técnica para vaga de tecnologia",
    "Entrevista para vaga de atendimento em hotel de luxo",
    "Reunião com a diretoria sobre resultados do trimestre",
    "Atender um cliente estrangeiro por chamada",
    "Explicar um problema técnico para quem não é da área",
    "Fazer uma apresentação de vendas",
    "Resolver a reclamação de um cliente",
    "Escrever e responder e-mails do dia a dia",
    "Networking em um evento da área",
    "Treinar um colega novo",
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

export const DEFAULT_PHONE_COUNTRY: CountryCode = "BR";

// Celular sem o nono digito e fixo continuam aceitos (10 ou 11 digitos com
// DDD), como antes da libphonenumber; o isValid() dela recusaria o primeiro.
export const PHONE_NATIONAL_LENGTH_OVERRIDES: Partial<
  Record<CountryCode, number[]>
> = { BR: [10, 11] };

// Tamanhos aceitos so pelo override acima que a libphonenumber nao formata:
// celular de 10 digitos comecando com 9 sai cru do formatNational().
export const PHONE_NATIONAL_FORMAT_OVERRIDES: Partial<
  Record<CountryCode, Record<number, { pattern: RegExp; format: string }>>
> = {
  BR: { 10: { pattern: /^(\d{2})(\d{4})(\d{4})$/, format: "($1) $2-$3" } },
};
