import { ActivityStatus, Level, PlanCode, QuestionFormat } from "../lib/prisma";
import {
  ACTIVITY_SUGGESTION_EMOJI,
  ANSWER_EMOJI,
  DOMAINS,
  INTENSIVE_UNTIL_MIN,
  MAX_DOC_ITEMS_PER_DOC,
  TRIAL_DAYS,
} from "../lib/constants";
import {
  capitalizeFirst,
  sanitizeText,
  sanitizeWhatsappContent,
} from "../lib/utils";
import { AnswerEvaluationResult } from "../lib/llm-schemas";
import { formatCommand } from "../lib/commands";
import { shuffle } from "lodash";
import type { FormattedMessage } from "../types/out-message";
import type { GeneratedDocMetadata } from "../types/domain";

export function formatOnboardingMsg1(): FormattedMessage {
  return { text: "Hi 👋 Bem-vindo a *Fluizer*." };
}

export function formatOnboardingMsg2(): FormattedMessage {
  return {
    text: "Pratique inglês com IA, no seu ritmo, sobre o que você quiser.",
  };
}

export function formatOnboardingMsg3(): FormattedMessage {
  return {
    text: "Conte o que quer praticar, ou envie um arquivo de texto, imagem ou PDF com conteúdo em inglês: página de livro, post nas redes sociais ou material de aula.",
  };
}

export function formatOnboardingMsg4(): FormattedMessage {
  return {
    text: "Ao longo do dia, chegam perguntas sobre o que você escolher praticar, aqui mesmo.",
  };
}

export function formatOnboardingMsg5(): FormattedMessage {
  return {
    text: `Você tem ${TRIAL_DAYS} ${TRIAL_DAYS > 1 ? "dias" : "dia"} pra praticar sem custo. Use ${formatCommand("help")} pra ver os comandos disponíveis.`,
  };
}

export function formatMaterialGuidance(): string {
  return `Use ${formatCommand("new_activity")} para praticar um tema à sua escolha.\n\nOu envie um arquivo de texto em inglês: foto de página de livro, captura de tela de conversa, letra de música, post nas redes sociais, material de aula ou PDF.`;
}

export function formatNoActivity(): FormattedMessage {
  return {
    text: [
      "Você ainda não tem atividade ativa.",
      "",
      formatMaterialGuidance(),
      "",
      `_Use ${formatCommand("help")} para ver os comandos disponíveis._`,
    ].join("\n"),
  };
}

export function formatPlanExpired(
  planCode: PlanCode,
  checkoutUrl: string,
): FormattedMessage {
  const title =
    planCode === "trial"
      ? "⏳ *Seu período de teste encerrou.*"
      : "🔒 *Seu acesso encerrou.*";

  const text = `Continue praticando por mais 30 dias por R$21,90. Acesse o link abaixo para pagar ou use ${formatCommand("support")} para qualquer dúvida ou dificuldade.`;
  const body = `Continue praticando por mais 30 dias por R$21,90. Use ${formatCommand("support")} para qualquer dúvida ou dificuldade.`;

  return {
    text: [title, "", text, "", checkoutUrl].join("\n"),
    interactive: {
      body: [title, "", body].join("\n"),
      buttons: [
        {
          id: "checkout",
          label: "Pagar agora",
          type: "link",
          url: checkoutUrl,
        },
      ],
    },
  };
}

export function formatPaymentConfirmed(): FormattedMessage {
  return {
    text: [
      "✅ *Pagamento confirmado.*",
      "",
      "Seu acesso está liberado pelos próximos 30 dias.",
      "",
      `Sempre que precisar, use ${formatCommand("help")} para listar os comandos disponíveis e ${formatCommand("support")} para fala com a gente.`,
      "",
      "Boa prática.",
    ].join("\n"),
  };
}

const LEVEL_LABEL: Record<Level, string> = {
  [Level.basic]: "básico",
  [Level.intermediate]: "intermediário",
  [Level.advanced]: "avançado",
};

export function formatLevelQuestion(): FormattedMessage {
  return {
    text: [
      "*Nível de Inglês*",
      "Qual é o seu nível de inglês? Isso define o idioma e o formato das perguntas que você vai receber.",
      "",
      "a) Básico",
      "b) Intermediário",
      "c) Avançado",
      "",
      `_Use ${formatCommand("cancel", { strictMode: false })} para sair._`,
    ].join("\n"),
    interactive: {
      body: [
        "*Nível de Inglês*",
        "Qual é o seu nível de inglês? Isso define o idioma e o formato das perguntas que você vai receber.",
        "",
        `_Use ${formatCommand("cancel", { strictMode: false })} para sair._`,
      ].join("\n"),
      buttons: [
        { id: "level_basic", label: "Básico" },
        { id: "level_intermediate", label: "Intermediário" },
        { id: "level_advanced", label: "Avançado" },
      ],
    },
  };
}

export function formatLevelConfirmed(): FormattedMessage {
  return { text: "Nível atualizado com sucesso." };
}

export function formatLevelCanceled(): FormattedMessage {
  return { text: "Ok, nenhuma alteração feita." };
}

export function formatCommandList(level: Level | null): FormattedMessage {
  const nivelLabel = level
    ? `atualiza o nível do seu inglês. atual: ${LEVEL_LABEL[level]}`
    : "define o nível do seu inglês";
  return {
    text: [
      "*Comandos disponíveis:*",
      "",
      `${formatCommand("help")} - ver essa lista de comandos`,
      //"*cancelar* - sai do fluxo ou ação em andamento",
      `${formatCommand("practice_now")} - prática intensiva`,
      `${formatCommand("pause")} - pausar atividade ou prática intensiva em andamento`,
      `${formatCommand("resume")} - retomar atividade pausada`,
      `${formatCommand("list_activities")} - sua atividade atual`,
      `${formatCommand("new_activity")} - cria uma atividade com tema gerado por você`,
      `${formatCommand("set_level")} - ${nivelLabel}`,
      `${formatCommand("support")} - fala com a equipe`,
      "",
      "_Envie um arquivo de texto, imagem ou PDF com conteúdo em inglês suficiente para virar prática._",
    ].join("\n"),
  };
}

function getEmojiNumber(num: number): string {
  const numberMap: Record<string, string> = {
    "0": "0️⃣",
    "1": "1️⃣",
    "2": "2️⃣",
    "3": "3️⃣",
    "4": "4️⃣",
    "5": "5️⃣",
    "6": "6️⃣",
    "7": "7️⃣",
    "8": "8️⃣",
    "9": "9️⃣",
  };

  return numberMap[num.toString()] || num.toString();
}

export function formatDomainQuestion(): FormattedMessage {
  const options = DOMAINS.map((g, i) => `${getEmojiNumber(i + 1)} ${g.label}`);
  const body = [
    "*Objetivo (1/3)*",
    "Informe o número de um objetivo abaixo.",
    "",
    ...options,
    "",
    `_Use ${formatCommand("cancel", { strictMode: false })} para sair._`,
  ].join("\n");
  return {
    text: body,
    interactive: {
      body,
      buttons: [
        { id: "first_option", type: "reply", label: "Primeira opção" },
        { id: "random", type: "reply", label: "Escolha para mim" },
      ],
    },
  };
}

export function formatTopicQuestion(topics: string[]): FormattedMessage {
  const options = topics.map((s, i) => `${getEmojiNumber(i + 1)} ${s}`);
  const body = [
    "*Assunto (2/3)*",
    "Do que você gosta? Escreva qualquer assunto que queira praticar.",
    "Se preferir, escolha um número abaixo.",
    "",
    ...options,
    "",
    `_Use ${formatCommand("cancel", { strictMode: false })} para sair._`,
  ].join("\n");
  return {
    text: body,
    interactive: {
      body,
      buttons: [
        { id: "first_option", type: "reply", label: "Primeira opção" },
        { id: "random", type: "reply", label: "Escolha para mim" },
      ],
    },
  };
}

export function formatFocusQuestion(
  suggestions: { key: string; label: string }[],
): FormattedMessage {
  const options = suggestions.map(
    (s, i) => `${getEmojiNumber(i + 1)} ${s.label}`,
  );
  const body = [
    "*Foco (3/3)*",
    "Informe o número de um foco abaixo ou escreva outro.",
    "",
    ...options,
    "",
    `_Use ${formatCommand("cancel", { strictMode: false })} para sair._`,
  ].join("\n");
  return {
    text: body,
    interactive: {
      body,
      buttons: [
        { id: "first_option", type: "reply", label: "Primeira opção" },
        { id: "random", type: "reply", label: "Escolha para mim" },
      ],
    },
  };
}

export function formatNewActivityFlowCanceled(
  hasActiveActivity = false,
): FormattedMessage {
  return {
    text: hasActiveActivity
      ? "Ok, cancelado. Seguindo com a atividade atual."
      : "Ok, cancelado.",
  };
}

export function formatNewActivityFlowCanceledGuidance(): FormattedMessage {
  return {
    text: `Use ${formatCommand("new_activity")} para começar, ou ${formatCommand("help")} para ver a lista de comandos.`,
  };
}

export function formatSetFirstLevelCanceled(): FormattedMessage {
  return {
    text: `Use ${formatCommand("new_activity")} para tentar de novo, ou ${formatCommand("help")} para ver a lista de comandos.`,
  };
}

export function formatFirstNewActivityCanceled(): FormattedMessage {
  return {
    text: `Use ${formatCommand("new_activity")} para começar quando quiser, ou ${formatCommand("help")} para ver a lista de comandos.`,
  };
}

export function formatNewActivityFlowExpired(): FormattedMessage {
  return {
    text: `Criação da nova atividade encerrada por inatividade. Pode recomeçar quando quiser com ${formatCommand("new_activity")}.`,
  };
}

export function formatTopicError(): FormattedMessage {
  return {
    text: `Assunto inválido. Envie outra opção, ou use ${formatCommand("cancel", { strictMode: false })} para sair.`,
  };
}

export function formatFocusError(): FormattedMessage {
  return {
    text: `Não foi possível usar essa opção. Tente descrever de outra forma, ou use ${formatCommand("cancel", { strictMode: false })} para sair.`,
  };
}

export function formatFocusTooMany(): FormattedMessage {
  return {
    text: `Não é possível informar mais de 2 opções. Tente de novo com uma ou duas opções, ou use ${formatCommand("cancel", { strictMode: false })} para sair.`,
  };
}

export function formatSelectionOutOfRange(): FormattedMessage {
  return { text: "Escolha apenas uma das opções disponíveis na lista." };
}

export function formatSelectionMixedFormat(): FormattedMessage {
  return {
    text: "Informe ou o número da lista ou o texto, sem misturar os dois formatos.",
  };
}

export function formatSelectionSingleOnly(): FormattedMessage {
  return { text: "Escolha apenas uma opção da lista." };
}

export function formatFocusNumericTooMany(): FormattedMessage {
  return { text: "Você pode escolher até 2 opções da lista." };
}

type ActivityListItem = {
  status: ActivityStatus;
  title: string;
  userLevel: Level;
  updatedAt: Date;
};

export function selectArchivedActivities<T extends { status: ActivityStatus }>(
  activities: T[],
): T[] {
  return activities.filter((a) => a.status === "archived").slice(0, 3);
}

export function formatActivitiesList(
  activities: ActivityListItem[],
): FormattedMessage {
  const current = activities.filter((a) =>
    ["active", "paused"].includes(a.status),
  );
  const archived = selectArchivedActivities(activities);

  if (current.length === 0 && archived.length === 0) return formatNoActivity();

  const lines: string[] = [];

  if (current.length > 0) {
    lines.push("*Atividade atual:*\n");
    current.forEach((a) => {
      const label = a.status === "paused" ? "pausada" : "ativa";
      const displayTitle = a.title || "Sem título";
      lines.push(`*${displayTitle}* - ${LEVEL_LABEL[a.userLevel]} - ${label}`);
    });
  }

  if (archived.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("*Arquivadas:*\n");
    archived.forEach((a, index) => {
      const displayTitle = a.title || "Sem título";
      // lines.push(
      //   `${index + 1}. _${format(a.updatedAt, "dd/MM")}_ - *${displayTitle}*`,
      // );
      lines.push(`${index + 1}. *${displayTitle}*`);
    });
  }

  const currentStatus = current.length > 0 ? current[0].status : null;
  let textFooter = "";
  if (currentStatus === "active")
    textFooter = `_Use ${formatCommand("pause")} para interromper._ `;
  else if (currentStatus === "paused")
    textFooter = `_Use ${formatCommand("resume")} para continuar._ `;
  textFooter += `_Para criar uma atividade, use ${formatCommand("new_activity")} ou envie um arquivo de texto, imagem ou PDF com conteúdo em inglês suficiente para virar prática._`;
  if (textFooter) lines.push("", textFooter);

  return { text: lines.join("\n") };
}

export function formatDocReceiving(): FormattedMessage {
  return { text: "✅ Recebido e processando..." };
}

export function formatDocProcessed(
  hasWarning: boolean,
  remaining: number,
  metadata?: GeneratedDocMetadata | null,
): FormattedMessage {
  const topicContext =
    metadata?.domain && metadata?.topic && metadata?.focus?.length
      ? {
          domain: metadata.domain,
          topic: metadata.topic,
          focus: metadata.focus.join(" e "),
        }
      : null;
  const intro = topicContext
    ? `Pronto. A primeira pergunta chega em instantes.\n\n*Objetivo:* ${sanitizeWhatsappContent(topicContext.domain)}\n*Assunto:* ${sanitizeWhatsappContent(topicContext.topic)}\n*Foco:* ${sanitizeWhatsappContent(topicContext.focus)}`
    : "Pronto. A primeira pergunta chega em instantes.";
  const lines = [intro];
  if (hasWarning)
    lines.push("\nAlguns termos pareceram inconsistentes e foram ignorados.");
  if (remaining === 1)
    lines.push("\n_Você ainda pode enviar mais 1 atividade hoje._");
  if (remaining === 0) lines.push("\n_Essa é sua última atividade do dia._");
  return { text: lines.join("") };
}

export function formatGuideAfterFirstFeedback(): FormattedMessage {
  return {
    text: `As próximas perguntas chegam aos poucos durante o dia. Use ${formatCommand("practice_now")} para iniciar agora com um ritmo mais rápido.`,
    interactive: {
      body: `As próximas perguntas chegam aos poucos durante o dia. Toque em Praticar para seguir num ritmo mais rápido agora.`,
      buttons: [
        {
          id: "practice_now",
          label: "Praticar",
          type: "reply",
        },
      ],
    },
  };
}

export function formatDocProcessingFailed(): FormattedMessage {
  return { text: "Algo deu errado no processamento. Tente outro material." };
}

export function formatDocNoQuestions(): FormattedMessage {
  return {
    text: "Não foi possível gerar perguntas a partir desse material. Tente outro material.",
  };
}

export function formatIntensiveModeStopped(
  pendingQuestion: boolean,
): FormattedMessage {
  let message = "Modo prática intensiva pausado. Voltando para o ritmo normal.";
  if (pendingQuestion) {
    message += "\n\n⚠️ Encerre respondendo a última pergunta em aberto.";
  }
  return { text: message };
}

export function formatDailyPracticeLimitReached(): FormattedMessage {
  return {
    text: "Você usou toda sua prática disponível de hoje, mas amanhã tem mais.",
  };
}

export function formatIntensiveDailyLimitReached(): FormattedMessage {
  return {
    text: "Você atingiu o limite diário de prática intensiva. Sua prática ao longo do dia continua normal.",
  };
}

export function formatActivityReplacePrompt(
  title: string,
  activitiesRemaining: number,
): FormattedMessage {
  const limitNote =
    activitiesRemaining === 1
      ? "\n_Você só pode criar mais uma atividade hoje._"
      : activitiesRemaining === 0
        ? "\n_Esse foi sua última atividade do dia._"
        : "";

  const text = [
    `Você já tem uma atividade em andamento${title ? `: *"${title}"*` : ""}. Deseja arquivar esta atividade e começar uma nova?`,
    "",
    `_Use ${formatCommand("confirm_yes")} para continuar ou ${formatCommand("confirm_no")} para manter o atual._${limitNote}`,
  ].join("\n");

  const body = [
    `Você já tem uma atividade em andamento${title ? `: *"${title}"*` : ""}. Deseja arquivar esta atividade e começar uma nova?`,
  ].join("\n");

  return {
    text,
    interactive: {
      body,
      buttons: [
        {
          id: "confirm_yes",
          label: "Sim, continuar",
        },
        { id: "confir_no", label: "Não, cancelar" },
      ],
    },
  };
}

export function formatDailyActivityLimitReached(): FormattedMessage {
  return { text: "⚠️ Você atingiu o limite de atividades de hoje." };
}

export function formatDocItemReceived(itemCount: number): FormattedMessage {
  const suffix = `Você pode enviar mais materiais ou só aguardar. Use ${formatCommand("cancel")} para descartar e começar de novo.`;
  if (itemCount === 1) return { text: `Recebido. ${suffix}` };
  return { text: `Recebido ${itemCount}/${MAX_DOC_ITEMS_PER_DOC}. ${suffix}` };
}

export function formatDocItemLimitReached(): FormattedMessage {
  return {
    text: `⚠️ Essa atividade já atingiu o limite de ${MAX_DOC_ITEMS_PER_DOC} materiais. Continuando com o que já foi enviado...`,
  };
}

export function formatPauseSuccess(title: string): FormattedMessage {
  return {
    text: `Atividade *${title || "Sem título"}* pausada. Use ${formatCommand("resume")} para continuar de onde parou.`,
  };
}

export function formatNoPausableDocs(): FormattedMessage {
  return { text: "Nenhuma atividade ativa no momento." };
}

export function formatResumeSuccess(title: string): FormattedMessage {
  return { text: `Retomando *${title || "Sem título"}*, de onde parou.` };
}

export function formatNoPausedDocs(): FormattedMessage {
  return { text: "Nenhuma atividade pausada no momento." };
}

export function formatSupportRequest(): FormattedMessage {
  return {
    text: `Escreva em uma única mensagem como podemos ajudar ou use ${formatCommand("cancel", { strictMode: false })} para sair.`,
  };
}

export function formatSupportReceived(): FormattedMessage {
  return {
    text: "Sua mensagem foi enviada! Um especialista entrará em contato em breve.",
  };
}

export function formatShortTextWithDocs(): FormattedMessage {
  return {
    text: `Material recebido. Aguarde ou use ${formatCommand("help")} para ver os comandos disponíveis.`,
  };
}

export function formatShortTextNoDocs(): FormattedMessage {
  return {
    text: `Use ${formatCommand("new_activity")} para praticar um tema à sua escolha, ou envie um arquivo de texto, imagem ou PDF para praticar durante o dia.\n\n_Use ${formatCommand("help")} para ver todos os comandos._`,
  };
}

export function getRoundCompletedReadingLine(right: number, responses: number) {
  const rate = responses > 0 ? right / responses : 0;

  let reading: string;

  if (responses < 5) {
    reading =
      "Poucas perguntas nessa rodada, a leitura fica mais precisa seguindo.";
  } else if (rate >= 0.8) {
    reading = "Poucas respostas saíram erradas.";
  } else if (rate >= 0.5) {
    reading = "Resultado dividido entre certo e errado.";
  } else {
    reading = "A maioria das respostas ainda saiu errada.";
  }

  return { rate, reading };
}

export function formatRoundCompletedFallback(): FormattedMessage {
  return {
    text: "Você concluiu as perguntas dessa atividade. Envie um novo material ou continue revisando no ritmo normal para fixar mais.",
  };
}

export function formatRoundCompletedSummary(data: {
  questionCount: number;
  right: number;
  responses: number;
  score: number;
}): FormattedMessage {
  const { questionCount, right, responses, score } = data;
  const { rate, reading } = getRoundCompletedReadingLine(right, responses);
  const percentual = Math.round(rate * 100);

  return {
    text: [
      `📊 Você concluiu as ${questionCount} perguntas dessa atividade, ${percentual}% de acerto. ${reading} Score: ${score.toFixed(1)}`,
      "",
      "Continue praticando no seu ritmo.",
    ].join("\n"),
  };
}

export function getActivitySummaryReadingLine(
  right: number,
  responses: number,
) {
  const rate = responses > 0 ? right / responses : 0;

  let reading: string;
  let tip: string;

  if (responses < 5) {
    reading = "Ainda no início dessa atividade.";
    tip = "Não deu tempo de firmar isso antes da troca de material.";
  } else if (rate >= 0.8) {
    reading = "Poucas respostas saíram erradas.";
    tip =
      "Você fixou a maior parte desse conteúdo antes de trocar de material.";
  } else if (rate >= 0.5) {
    reading = "Resultado dividido entre certo e errado.";
    tip = "Parte relevante desse conteúdo ficou sem fixar antes da troca.";
  } else {
    reading = "A maioria das respostas ainda saiu errada.";
    tip = "A maior parte desse conteúdo ficou sem fixar antes da troca.";
  }

  return { rate, reading, tip };
}

function getCoverageClause(responses: number, questionCount: number): string {
  if (responses <= 0 || responses >= questionCount) return "";

  const missing = questionCount - responses;
  const coverage = responses / questionCount;

  if (coverage < 0.5) {
    return `Ficaram ${missing} perguntas sem resposta, mais da metade do total.`;
  }

  return `Ficaram ${missing} perguntas sem resposta.`;
}

export function formatActivitySuggestion(): FormattedMessage {
  const text = [
    `${ACTIVITY_SUGGESTION_EMOJI} *Sugestão de nova atividade*`,
    "",
    `Você já domina boa parte do que esse material trouxe. Use ${formatCommand("new_activity")}, envie um material novo, ou apenas aguarde a próxima pergunta.`,
  ].join("\n");
  return {
    text,
    interactive: {
      body: [
        `${ACTIVITY_SUGGESTION_EMOJI} *Sugestão de nova atividade*`,
        "",
        "Você já domina boa parte do que esse material trouxe. Clique em *Nova atividade*, envie um material novo, ou apenas aguarde a próxima pergunta.",
      ].join("\n"),
      buttons: [{ id: "new_activity_suggestion", label: "Nova atividade" }],
    },
  };
}

export function formatPreviousActivitySummary(
  data: PreviousActivitySummaryData,
): FormattedMessage {
  const {
    activityTitle,
    questionCount,
    right,
    partial,
    wrong,
    responses,
    reviews,
    period,
    score,
  } = data;

  const { rate, reading, tip } = getActivitySummaryReadingLine(
    right,
    responses,
  );
  const wrongTotal = wrong + partial;
  const percentual = Math.round(rate * 100);
  const isFullCoverage = responses > 0 && responses === questionCount;

  const reviewsClause =
    reviews > 0
      ? `, sendo ${reviews} ${reviews === 1 ? "delas revisada" : "delas revisadas"} mais de uma vez antes de fixar`
      : "";

  let rightClause = isFullCoverage
    ? `você respondeu todas as ${questionCount} perguntas, ${percentual}% de acerto`
    : `você respondeu ${responses} de ${questionCount} perguntas, ${percentual}% de acerto entre as respondidas`;

  rightClause +=
    percentual > 0 && percentual < 100
      ? ` (${right} certas e ${wrongTotal} erradas)`
      : "";
  rightClause += `${reviewsClause}.`;

  const coverageClause = getCoverageClause(responses, questionCount);

  const stats = `Em ${period}, ${rightClause}${coverageClause ? ` ${coverageClause}` : ""}`;

  return {
    text: [
      `📊 Resumo da última atividade: *${activityTitle}*`,
      "",
      stats,
      "",
      `${reading} ${tip} Score: ${score.toFixed(1)}`,
    ].join("\n"),
  };
}

export function formatImageBlocked(): FormattedMessage {
  return { text: "Não foi possível processar esse material." };
}

export function formatImageUnreadable(): FormattedMessage {
  return {
    text: "Não conseguimos ler essa imagem. Tente enviar com melhor iluminação ou resolução.",
  };
}

export function formatIntensiveModeActivated({
  isIntensiveMode,
  hasPendingQuestion,
}: {
  isIntensiveMode: boolean;
  hasPendingQuestion?: boolean;
}): FormattedMessage {
  let msg = isIntensiveMode
    ? "O modo prática intensiva já está ativado. "
    : "Modo prática intensiva ativado. Perguntas chegam uma após a outra, no seu ritmo. ";
  if (hasPendingQuestion) {
    msg += "\n\n⚠️ Você tem uma pergunta pendente para responder! ";
  }
  msg += `\n\n_Pare usando ${formatCommand("pause")} ou após ${INTENSIVE_UNTIL_MIN} minutos sem resposta._`;
  return { text: msg };
}

const ACTIVITY_START_MESSAGES = [
  "Vamos praticar!",
  "Começando agora!",
  "Hora de praticar!",
];

export function formatActivityStart(title: string): FormattedMessage {
  const prefix =
    ACTIVITY_START_MESSAGES[
      Math.floor(Math.random() * ACTIVITY_START_MESSAGES.length)
    ];
  return { text: `📘 ${prefix} *${sanitizeWhatsappContent(title)}*` };
}

export function formatChoiceQuestion(
  question: string,
  options: string[],
): string {
  if (!options.length) return question;
  const labels = "abcde";
  return `${question}\n\n${options.map((o, i) => `${labels[i]}) ${o}`).join("\n")}`;
}

type PreviousActivitySummaryData = {
  activityTitle: string;
  questionCount: number;
  right: number;
  partial: number;
  wrong: number;
  responses: number;
  reviews: number;
  period: string;
  score: number;
};

export function formatUpgradePrompt(): FormattedMessage {
  return {
    text: `Envio de imagem é exclusivo do plano Pro. _Use ${formatCommand("support")} para saber mais._`,
  };
}

const NUDGE_BODY_POOL = [
  "Não deixa o inglês esfriar.",
  "Sem prática, o cérebro esquece rápido demais.",
  "Você já começou, o mais difícil já passou.",
  "Consistência é o que separa quem aprende de quem tenta.",
  "Um pouco por dia vale mais que muito de vez em quando.",
  "Vocabulário sem uso enferruja rápido.",
  "Prática puxa memória, pausa apaga memória.",
  "Seu inglês não evolui enquanto você espera.",
  "A repetição é o que fixa o aprendizado.",
  "Quanto mais tempo parado, mais difícil retomar.",
  "O que você estudou só fica se for revisado.",
  "Hábito vale mais que vontade.",
  "Só tem duas opções: praticar ou esquecer.",
  "O progresso depende de manter o ritmo.",
  "Sem repetição, o que você aprendeu se perde.",
];

const NUDGE_CLOSING_POOL = [
  "É só responder.",
  "Quando puder, é só responder.",
  "A pergunta continua aqui te esperando.",
  "Pode responder quando quiser.",
  "É só responder que seguimos pra próxima.",
];

// fonte de verdade do texto real dos templates na Meta - alterar aqui antes de atualizar na Meta
const NUDGE_TEMPLATE_CONFIG: Record<
  string,
  { templateName: string; text: string }
> = {
  d2: {
    templateName: "nudge_d2",
    text: "Você não respondeu suas perguntas nos últimos 2 dias. Quando quiser retomar, é só responder.",
  },
  d3: {
    templateName: "nudge_d3",
    text: "Você não respondeu suas perguntas nos últimos 3 dias. Sua atividade continua aqui te esperando. É só responder.",
  },
  d7: {
    templateName: "nudge_d7",
    text: "Você não respondeu suas perguntas nos últimos 7 dias. Sua atividade continua aqui te esperando. É só responder.",
  },
  d14: {
    templateName: "nudge_d14",
    text: "Você não respondeu suas perguntas nos últimos 14 dias. Sua atividade continua aqui te esperando. É só responder.",
  },
};

export function formatNudgeMessage(step: string): FormattedMessage {
  const template = NUDGE_TEMPLATE_CONFIG[step];
  if (template)
    return { text: template.text, templateName: template.templateName };
  const body =
    NUDGE_BODY_POOL[Math.floor(Math.random() * NUDGE_BODY_POOL.length)];
  const closing =
    NUDGE_CLOSING_POOL[Math.floor(Math.random() * NUDGE_CLOSING_POOL.length)];
  return { text: `${body} ${closing}`, templateName: null };
}

export function formatCanceled(): FormattedMessage {
  return { text: "Ok, cancelado." };
}

export function formatActivityReplaceCanceled(): FormattedMessage {
  return { text: "Ok, cancelado e seguindo com a atividade atual." };
}

export function formatInvalidResumeIndex(): FormattedMessage {
  return {
    text: `Número inválido. Use ${formatCommand("list_activities")} para ver as opções.`,
  };
}

export function formatNoActiveActivity(): FormattedMessage {
  return { text: "Nenhuma atividade ativa no momento." };
}

export function formatAllQuestionsAnswered(): FormattedMessage {
  return { text: "Todas as perguntas já foram respondidas." };
}

export function formatNoPendingAction(): FormattedMessage {
  return { text: "Nenhuma ação pendente." };
}

export function formatFeedbackFailed(): FormattedMessage {
  return { text: "Não foi possível avaliar essa resposta." };
}

export function formatPracticeWaiting(): FormattedMessage {
  return {
    text: "Aguarde, a próxima mensagem chega em breve. Para mudar de atividade, envie um novo material.",
  };
}

export function formatGenericError(): FormattedMessage {
  return {
    text: "Não foi possível processar sua mensagem agora. Tente em instantes.",
  };
}

export function formatUnsupportedFileType(): FormattedMessage {
  return {
    text: "Formato não suportado. Envie um arquivo de texto, imagem ou PDF.",
  };
}

export function formatVideoUnsupported(): FormattedMessage {
  return {
    text: `Vídeo ainda não é suportado, mas é um formato considerado para o futuro. Envie texto, imagem ou PDF, ou use ${formatCommand("help")} para ver os comandos disponíveis.`,
  };
}

export function formatAudioUnsupported(): FormattedMessage {
  return {
    text: `Esse áudio não é suportado por aqui. Pra responder às perguntas, grave um áudio segurando o microfone. Envie texto, imagem ou PDF, ou use ${formatCommand("help")} para ver os comandos disponíveis.`,
  };
}

export function formatInvalidMessageType(): FormattedMessage {
  return {
    text: `Mensagem inválida. Use ${formatCommand("help")} para ver os comandos disponíveis.`,
  };
}

export function formatIntensivePendingQuestion(): FormattedMessage {
  return { text: "Estamos preparando sua próxima pergunta." };
}

type EvaluationStatus = "right" | "wrong" | "partial";

const STATUS_OPENINGS: Record<EvaluationStatus, string[]> = {
  right: ["Exato!", "Correto!", "Perfeito!", "Boa!", "Isso!"],
  wrong: [
    "Errado!",
    "Infelizmente não!",
    "Ops, errado!",
    "Ops, não é isso!",
    "Hmmm, errou!",
    "Humm, não!",
  ],
  partial: ["Quase!", "Quase lá!", "Por pouco!"],
};

const STATUS_OPENINGS_EN: Record<EvaluationStatus, string[]> = {
  right: ["Nice!", "Correct!", "Perfect!", "That's it!", "Exactly!"],
  wrong: ["Wrong!", "Not quite!", "Nope!", "That's not it!", "Hmm, wrong!"],
  partial: ["Almost!", "So close!", "Not quite there!"],
};

const USER_UNKNOW_OPENINGS: string[] = [
  "Tudo bem!",
  "Acontece!",
  "Sem problema!",
  "Tranquilo!",
  "Não se preocupe!",
];

const USER_UNKNOW_OPENINGS_EN: string[] = [
  "No worries!",
  "It happens!",
  "No problem!",
  "That's okay!",
  "Don't worry!",
];

export function getFeedbackOpening(
  status: EvaluationStatus,
  userUnknown: boolean,
  level?: Level,
): string {
  const isAdvanced = level === Level.advanced;

  const openings = userUnknown
    ? isAdvanced
      ? USER_UNKNOW_OPENINGS_EN
      : USER_UNKNOW_OPENINGS
    : isAdvanced
      ? STATUS_OPENINGS_EN[status]
      : STATUS_OPENINGS[status];

  return shuffle(openings).pop() ?? openings[0];
}

export function formatFeedback(
  feedbackResult: AnswerEvaluationResult,
  level?: Level,
): FormattedMessage {
  const {
    status: evalStatus,
    feedback: agentFeedback,
    right_answer: rightAnswer,
    user_unknown: userUnknown,
  } = feedbackResult;

  const feedback = sanitizeText(agentFeedback);
  const emoji = ANSWER_EMOJI[evalStatus];
  const opening = getFeedbackOpening(evalStatus, !!userUnknown, level);

  const normalizeRightAnswerAndFeedback = (s: string) =>
    s
      .toLowerCase()
      .replace(/["'.,!?]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const feedbackIsRightAnswer =
    rightAnswer &&
    normalizeRightAnswerAndFeedback(rightAnswer) ===
      normalizeRightAnswerAndFeedback(feedback);

  const result = [];
  if (emoji) result.push(emoji);
  if (opening) result.push(opening);
  if (evalStatus !== "right" && rightAnswer && !feedbackIsRightAnswer)
    result.push(`"${capitalizeFirst(rightAnswer)}".`);
  if (feedback)
    result.push(feedback.indexOf('"') === -1 ? `"${feedback}"` : feedback);

  return { text: result.join(" ") };
}

export function formatFeedbackToSpeech(
  feedbackResult: AnswerEvaluationResult,
): FormattedMessage {
  const { feedback: agentFeedback } = feedbackResult;

  return { text: sanitizeText(agentFeedback) };
}

export function formatEvalTip(tip: string): FormattedMessage {
  return { text: `💡 ${tip}` };
}

function insertTermHint(
  question: string,
  hint: string | null | undefined,
  format: QuestionFormat | null,
): string {
  if (!hint) return question;

  const formatsWithQuotedTerm: QuestionFormat[] = [
    QuestionFormat.recall_inverted,
  ];
  if (!format || !formatsWithQuotedTerm.includes(format)) return question;

  const quotedTermPattern = /(["“][^"”]+["”])/;
  if (quotedTermPattern.test(question)) {
    return question.replace(quotedTermPattern, `$1 (${hint})`);
  }
  // termo entre aspas não encontrado, evita posicionar errado
  return question;
}

const scenarioEnClosings = [
  "How do you say that in English?",
  "How would you say this in English?",
  "Write that in English.",
  "Say it in English.",
];

const scenarioPtClosings = [
  "Como se diz isso em inglês?",
  "Como você diria essa parte em inglês?",
  "Escreva isso em inglês.",
  "Diga isso em inglês.",
];

function pickScenarioClosing(level: Level | null): string {
  const pool = level === Level.basic ? scenarioPtClosings : scenarioEnClosings;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function formatQuestion(question: {
  question: string;
  questionFormat: QuestionFormat | null;
  questionOptions: string[];
  termHint?: string | null;
  level?: Level | null;
}): FormattedMessage {
  const withHint = insertTermHint(
    question.question,
    question.termHint,
    question.questionFormat,
  );

  if (
    question.questionFormat === QuestionFormat.choice &&
    question.questionOptions.length > 0
  ) {
    return { text: formatChoiceQuestion(withHint, question.questionOptions) };
  }

  if (question.questionFormat === QuestionFormat.gap_fill) {
    return { text: `Complete: ${withHint}` };
  }

  if (question.questionFormat === QuestionFormat.scenario) {
    return {
      text: `${withHint} ${pickScenarioClosing(question.level ?? null)}`,
    };
  }

  return { text: withHint };
}
