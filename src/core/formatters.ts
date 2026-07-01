import { Doc, ActivityStatus, Level } from "../lib/prisma";
import {
  ANSWER_EMOJI,
  INTENSIVE_UNTIL_MIN,
  MAX_DOC_ITEMS_PER_DOC,
  TRIAL_DAYS,
} from "../lib/constants";
import { sanitizeText, sanitizeWhatsappContent } from "../lib/utils";
import { AnswerEvaluationResult } from "../lib/llm-schemas";
import { shuffle } from "lodash";
import { format } from "date-fns";

export function formatOnboardingMsg1(): string {
  return "Hi! Bem-vindo a *Fluizer*. 👋";
}

export function formatOnboardingMsg2(): string {
  return `Envie o material da sua aula de inglês como texto, imagem ou PDF e recebe perguntas sobre ele ao longo do dia, aqui mesmo.`;
}

export function formatOnboardingMsg3(): string {
  return `Você tem ${TRIAL_DAYS} ${TRIAL_DAYS > 1 ? "dias" : "dia"} para praticar a vontade. Aproveite!`;
}

export function formatOnboardingMsg4(): string {
  return "Mande agora pra começar. Ou use *ajuda* pra ver os comandos disponíveis.";
}

export function formatPlanExpired(): string {
  return [
    "*Seu período de teste encerrou!*",
    "",
    "Para continuar praticando, assine o *Fluizer* por R$19,90/mês.",
    "",
    "_Use *suporte* para falar com a gente e ativar sua conta._",
  ].join("\n");
}

const LEVEL_LABEL: Record<Level, string> = {
  [Level.basic]: "básico",
  [Level.intermediate]: "intermediário",
  [Level.advanced]: "avançado",
};

export function formatLevelQuestion(): string {
  return [
    "Informe a letra que corresponde ao nível do seu inglês.",
    "",
    "a) - Básico",
    "b) - Intermediário",
    "c) - Avançado",
    "",
    "_Use *cancelar* para sair._",
  ].join("\n");
}

export function formatLevelConfirmed(): string {
  return "Nível atualizado com sucesso.";
}

export function formatLevelCanceled(): string {
  return "Ok, nenhuma alteração feita.";
}

export function formatCommandList(level: Level | null): string {
  const nivelLabel = level
    ? `atualiza o nível do seu inglês. atual: ${LEVEL_LABEL[level]}`
    : "define o nível do seu inglês";
  return [
    "*Comandos disponíveis:*",
    "",
    "*ajuda* - ver essa lista de comandos",
    //"*cancelar* - descartar atividade em andamento",
    "*praticar* - prática intensiva",
    "*pausar* - pausar atividade ou prática intensiva em andamento",
    "*retomar* - retomar atividade pausada",
    "*atividade* - sua atividade atual",
    `*nivel* - ${nivelLabel}`,
    "*suporte* - fala com a equipe",
    "",
    "_Envie texto, imagem ou PDF com conteúdo relevante para praticar._",
  ].join("\n");
}

type ActivityListItem = {
  status: ActivityStatus;
  title: string;
  userLevel: Level;
  updatedAt: Date;
  doc: Pick<Doc, "id" | "status">;
};

export function formatActivitiesList(activities: ActivityListItem[]): string {
  const current = activities.filter((a) =>
    ["active", "paused"].includes(a.status),
  );
  const archived = activities
    .filter((a) => a.status === "archived")
    .slice(0, 3);

  if (current.length === 0 && archived.length === 0) return formatNoDocs();

  const lines: string[] = [];

  if (current.length > 0) {
    lines.push("*Atividade atual:*\n");
    current.forEach((a) => {
      const label = a.doc.status === "paused" ? "pausada" : "ativa";
      const displayTitle = a.title || "Sem título";
      lines.push(`*${displayTitle}* - ${LEVEL_LABEL[a.userLevel]} - ${label}`);
    });
  }

  if (archived.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("*Arquivadas:*\n");
    archived.forEach((a) => {
      const displayTitle = a.title || "Sem título";
      lines.push(
        `_${format(a.updatedAt, "dd/MM")}_ - *${displayTitle}* - ${LEVEL_LABEL[a.userLevel]}`,
      );
    });
  }

  const currentStatus = current.length > 0 ? current[0].status : null;
  let textFooter = "";
  if (currentStatus === "active")
    textFooter = "_Use *pausar* para interromper._ ";
  else if (currentStatus === "paused")
    textFooter = "_Use *retomar* para continuar._ ";
  textFooter +=
    "_Para criar uma atividade, envie um texto, imagem ou PDF com conteúdo relevante._";
  if (textFooter) lines.push("", textFooter);

  return lines.join("\n");
}

export function formatNoDocs(): string {
  return "Você ainda não tem atividades.\nMande um texto, imagem ou PDF para começar.";
}

export function formatDocReceiving(): string {
  return "✅ Recebido e processando...";
}

export function formatDocProcessed(
  hasWarning: boolean,
  remaining: number,
): string {
  const lines = ["Pronto. Em alguns minutos chega a primeira pergunta."];
  if (hasWarning)
    lines.push("\nAlguns termos pareceram inconsistentes e foram ignorados.");
  if (remaining === 1)
    lines.push("\n_Você ainda pode enviar mais 1 atividade hoje._");
  if (remaining === 0) lines.push("\n_Essa foi sua última atividade do dia._");
  return lines.join("");
}

export function formatGuideAfterFirstFeedback(): string {
  return "A próxima pergunta chega mais tarde, no ritmo normal. Se quiser, use *praticar* e ative o modo intensivo agora.";
}

export function formatDocProcessingFailed(): string {
  return "Algo deu errado no processamento. Tente outro material.";
}

export function formatDocNoQuestions(): string {
  return "Não foi possível gerar perguntas a partir desse material. Tente outro material.";
}

export function formatIntensiveModeStopped(): string {
  return "Modo de prática intensiva pausado. Voltando para o ritmo normal de perguntas.";
}

export function formatDocConfirmPrompt(): string {
  return [
    "Esse parece ser um ótimo conteúdo pra praticar. Quer começar uma nova atividade com esse conteúdo?",
    "",
    "_Use *sim* para confirmar ou *não* para cancelar._",
  ].join("\n");
}

export function formatActivityReplacePrompt(
  title: string,
  activitiesRemaining: number,
): string {
  const limitNote =
    activitiesRemaining === 1
      ? "\n_Você só pode criar mais uma atividade hoje._"
      : activitiesRemaining === 0
        ? "\n_Esse foi sua última atividade do dia._"
        : "";

  return [
    `Você já tem uma atividade em andamento${title ? `: *"${title}"*` : ""}. Deseja arquivar e começar uma nova?`,
    "",
    `_Use *sim* para continuar ou *não* para manter o atual._${limitNote}`,
  ].join("\n");
}

export function formatDailyActivityLimitReached(): string {
  return "⚠️ Você atingiu o limite de atividades de hoje.";
}

export function formatDocItemReceived(itemCount: number): string {
  const suffix =
    "Você pode enviar mais materiais ou só aguardar. Use *cancelar* se quiser descartar e começar de novo.";
  if (itemCount === 1) return `Recebido. ${suffix}`;
  return `Recebido ${itemCount}/${MAX_DOC_ITEMS_PER_DOC}. ${suffix}`;
}

export function formatDocItemLimitReached(): string {
  return `⚠️ Essa atividade já atingiu o limite de ${MAX_DOC_ITEMS_PER_DOC} materiais. Continuando com o que já foi enviado...`;
}

export function formatPausePrompt(docs: Pick<Doc, "id" | "title">[]): string {
  const lines = docs.map((d, i) => `${i + 1}. ${d.title || "Sem título"}`);
  return `Qual atividade você quer pausar?\n\n${lines.join("\n")}\n\n_Digite o número ou use *cancelar*._`;
}

export function formatPauseSuccess(): string {
  return "Atividade pausada. Use *retomar* quando quiser continuar.";
}

export function formatNoPausableDocs(): string {
  return "Nenhuma atividade ativa no momento.";
}

export function formatResumePrompt(docs: Pick<Doc, "id" | "title">[]): string {
  const lines = docs.map((d, i) => `${i + 1}. ${d.title || "Sem título"}`);
  return `Qual atividade você quer retomar?\n\n${lines.join("\n")}\n\n_Digite o número ou *cancelar*._`;
}

export function formatResumeSuccess(): string {
  return "Atividade retomada. Vamos continuar de onde parou!";
}

export function formatNoPausedDocs(): string {
  return "Nenhuma atividade pausada no momento.";
}

export function formatSupportRequest(): string {
  return "Escreva em uma única mensagem como podemos ajudar ou use *cancelar* para sair.";
}

export function formatSupportReceived(): string {
  return "Sua mensagem foi enviada! Um especialista entrará em contato em breve.";
}

export function formatShortTextWithDocs(): string {
  return "Já recebi seu material. Aguarde ou use *ajuda* para ver os comandos disponíveis.";
}

export function formatShortTextNoDocs(): string {
  return "Adicione uma atividade para praticarmos durante o dia. Pode ser texto, imagem ou PDF.\n\n_Use *ajuda* para ver todos os comandos._";
}

export function formatPracticeComplete(): string {
  return "Você respondeu todas as perguntas dessa atividade. Envie um novo material ou aguarde para continuar praticando.";
}

export function formatImageNoText(): string {
  return "Não foi possível identificar conteúdo suficiente e relevante nessa imagem. Envie outro material como texto, imagem ou PDF.";
}

export function formatIntensiveModeActivated({
  isIntensiveMode,
  hasPendingQuestion,
}: {
  isIntensiveMode: boolean;
  hasPendingQuestion?: boolean;
}): string {
  let msg = isIntensiveMode
    ? "O modo prática intensiva já está ativado. "
    : "Modo prática intensiva ativado. Perguntas chegam uma após a outra, no seu ritmo. ";
  if (hasPendingQuestion) {
    msg += "\n\n⚠️ Você tem uma pergunta pendente para responder! ";
  }
  msg += `\n\n_Pare usando *pausar* ou após ${INTENSIVE_UNTIL_MIN} minutos sem resposta._`;
  return msg;
}

const START_MESSAGES = [
  "Vamos praticar!",
  "Começando agora!",
  "Hora de praticar!",
];

const CONTINUE_MESSAGES = [
  "Continuando!",
  "Próxima parte!",
  "Seguindo em frente!",
  "Vamos lá!",
  "Próximo!",
];

export function formatSectionTransition(
  title: string,
  isFirst: boolean,
): string {
  const pool = isFirst ? START_MESSAGES : CONTINUE_MESSAGES;
  const prefix = pool[Math.floor(Math.random() * pool.length)];
  return `📘 ${prefix} *${sanitizeWhatsappContent(title)}*`;
}

export function formatChoiceQuestion(
  question: string,
  options: string[],
): string {
  if (!options.length) return question;
  const labels = "abcdefghij";
  return `${question}\n\n${options.map((o, i) => `${labels[i]}) ${o}`).join("\n")}`;
}

type PreviousActivitySummaryData = {
  activityTitle: string;
  questionCount: number;
  right: number;
  partial: number;
  wrong: number;
  responses: number;
  revisadas: number;
  period: string;
};

export function formatPreviousActivitySummary(
  data: PreviousActivitySummaryData,
): string {
  const {
    activityTitle,
    questionCount,
    right,
    partial,
    wrong,
    responses,
    revisadas,
    period,
  } = data;
  const taxa = right / responses;

  let leitura: string;
  if (responses < 5) {
    leitura = "Você mal começou essa atividade.";
  } else if (taxa >= 0.8) {
    leitura = "Mandou bem nessa atividade.";
  } else if (taxa >= 0.5) {
    leitura = "Essa atividade rendeu, dá pra apertar mais.";
  } else {
    leitura = "Essa atividade travou bastante. Vale revisar.";
  }

  return [
    `📊 Atividade anterior: *${activityTitle}*`,
    "",
    `Período: ${period}`,
    `Perguntas: ${questionCount}`,
    `Respondidas: ${responses}`,
    `Revisadas: ${revisadas}`,
    `Corretas: ${right}`,
    `Erradas: ${wrong + partial}`,
    "",
    leitura,
  ].join("\n");
}

export function formatUpgradePrompt(reason: "audio" | "image"): string {
  const messages: Record<typeof reason, string> = {
    audio:
      "Envio de áudio é exclusivo do plano Pro. _Use *suporte* para saber mais._",
    image:
      "Envio de imagem é exclusivo do plano Pro. _Use *suporte* para saber mais._",
  };
  return messages[reason];
}

export type NudgePayload = { text: string; templateName: string | null };

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
  "Só tem duas opcoes: praticar ou esquecer.",
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

export function formatNudgeMessage(step: string): NudgePayload {
  const template = NUDGE_TEMPLATE_CONFIG[step];
  if (template)
    return { text: template.text, templateName: template.templateName };
  const body =
    NUDGE_BODY_POOL[Math.floor(Math.random() * NUDGE_BODY_POOL.length)];
  const closing =
    NUDGE_CLOSING_POOL[Math.floor(Math.random() * NUDGE_CLOSING_POOL.length)];
  return { text: `${body} ${closing}`, templateName: null };
}

export function humanizeFeedback(
  feedbackResult: AnswerEvaluationResult,
): string {
  const {
    status: evalStatus,
    feedback: agentFeedback,
    user_unknown: userUnknown,
  } = feedbackResult;
  let feedback = sanitizeText(agentFeedback);

  // humaniza feedback de "errado" para "não sei" quando o usuário indicou que não sabia a resposta
  if (evalStatus === "wrong" && userUnknown) {
    const openings = [
      "Tudo bem!",
      "Acontece!",
      "Sem problemas!",
      "Tranquilo!",
      "Não se preocupe!",
    ];
    const opening = shuffle(openings).pop() ?? openings[0];

    // substitui só a abertura, mantém o resto do feedback intacto
    return feedback.replace(
      /^(Errado!|Hmmm, errou!|Ops, errado!|Infelizmente não!|Hmmm, errou!)/,
      opening,
    );
  }

  feedback = `${ANSWER_EMOJI[evalStatus]} ${feedback}`;

  return feedback;
}
