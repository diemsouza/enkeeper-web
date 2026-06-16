import { Doc, ActivityStatus } from "@prisma/client";
import { ANSWER_EMOJI, MAX_DOCS_PER_DAY } from "../lib/constants";
import { sanitizeText, sanitizeWhatsappContent } from "../lib/utils";
import { AnswerEvaluationResult } from "../lib/llm-schemas";
import { shuffle } from "lodash";

export function formatOnboardingMsg1(): string {
  return "Hi! Bem-vindo a *Fluizer*. 👋";
}

export function formatOnboardingMsg2(): string {
  return "Manda o material da sua aula de inglês como texto, foto ou PDF e recebe perguntas sobre ele ao longo do dia, aqui mesmo.";
}

export function formatOnboardingMsg3(): string {
  return "Você tem 24 horas pra sentir na prática. Aproveita!";
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

export function formatCommandList(): string {
  return [
    "*Comandos disponíveis:*",
    "",
    "*ajuda* - ver essa lista de comandos",
    "*praticar* - prática intensiva",
    "*pausar* - pausar prática",
    "*retomar* - retomar prática pausada",
    "*conteudo* - seu conteúdo atual",
    "*suporte* - fala com a equipe",
    "",
    "_Mande um texto, áudio, imagem ou PDF com conteúdo relevante para praticar._",
  ].join("\n");
}

type ActivityDocItem = {
  status: ActivityStatus;
  doc: Pick<Doc, "id" | "title" | "status">;
};

export function formatDocsList(activities: ActivityDocItem[]): string {
  const current = activities.filter((a) =>
    ["active", "paused"].includes(a.status),
  );
  const archived = activities
    .filter((a) => a.status === "archived")
    .slice(0, 3);

  if (current.length === 0 && archived.length === 0) return formatNoDocs();

  const lines: string[] = [];

  if (current.length > 0) {
    lines.push("*Conteúdo atual:*");
    current.forEach((a) => {
      const label = a.doc.status === "paused" ? "pausado" : "ativo";
      lines.push(`• ${a.doc.title || "(processando...)"} - ${label}`);
    });
  }

  if (archived.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("*Arquivados:*");
    archived.forEach((a) => lines.push(`• ${a.doc.title || "(sem título)"}`));
  }

  lines.push("", "_Use *pausar* ou *retomar* para gerenciar._");

  return lines.join("\n");
}

export function formatNoDocs(): string {
  return "Você ainda não tem conteúdos.\nMande um texto, áudio, imagem ou PDF para começar.";
}

export function formatDocReceiving(): string {
  return "Recebido e processando...";
}

export function formatDocProcessed(
  hasWarning: boolean,
  remaining: number,
): string {
  const lines = ["Pronto. Em alguns minutos chega a primeira pergunta."];
  if (hasWarning)
    lines.push("\nAlguns termos pareceram inconsistentes e foram ignorados.");
  if (remaining === 1)
    lines.push("\n_Você ainda pode enviar mais 1 conteúdo hoje._");
  if (remaining === 0) lines.push("\n_Esse foi seu último conteúdo do dia._");
  return lines.join("");
}

export function formatDocProcessingFailed(): string {
  return "Algo deu errado no processamento. Tenta mandar de novo.";
}

export function formatDocNoQuestions(): string {
  return "Não consegui identificar conteúdo para praticar nesse material. Manda outro.";
}

export function formatDocConfirmPrompt(): string {
  return [
    "Esse parece ser um ótimo conteúdo para estudar. Quer usar?",
    "",
    "_Use *sim* para confirmar ou *não* para cancelar._",
  ].join("\n");
}

export function formatDocReplacePrompt(
  title: string,
  remaining: number,
): string {
  const limitNote =
    remaining === 1
      ? "\n_Você ainda pode enviar mais 1 conteúdo hoje._"
      : remaining === 0
        ? "\n_Esse foi seu último conteúdo do dia._"
        : "";

  return [
    `Você já tem um conteúdo ativo: *"${title}"*.`,
    "",
    "Quer substituir pelo novo conteúdo? O atual será arquivado.",
    "",
    `_Use *sim* para substituir ou *não* para manter o atual._${limitNote}`,
  ].join("\n");
}

export function formatDailyLimitReached(): string {
  return `Você atingiu o limite de ${MAX_DOCS_PER_DAY} conteúdos por dia. Tente novamente amanhã.`;
}

export function formatPausePrompt(docs: Pick<Doc, "id" | "title">[]): string {
  const lines = docs.map(
    (d, i) => `${i + 1}. ${d.title || "(processando...)"}`,
  );
  return `Qual conteúdo você quer pausar?\n\n${lines.join("\n")}\n\n_Digite o número ou use *cancelar*._`;
}

export function formatPauseSuccess(): string {
  return "Prática pausada. Use *retomar* quando quiser continuar.";
}

export function formatNoPausableDocs(): string {
  return "Nenhum conteúdo ativo no momento.";
}

export function formatResumePrompt(docs: Pick<Doc, "id" | "title">[]): string {
  const lines = docs.map(
    (d, i) => `${i + 1}. ${d.title || "(processando...)"}`,
  );
  return `Qual conteúdo você quer retomar?\n\n${lines.join("\n")}\n\n_Digite o número ou *cancelar*._`;
}

export function formatResumeSuccess(): string {
  return "Prática retomada. Vamos continuar de onde parou!";
}

export function formatNoPausedDocs(): string {
  return "Nenhum conteúdo pausado no momento.";
}

export function formatSupportRequest(): string {
  return "Escreva em uma única mensagem como podemos ajudar ou use *cancelar* para sair.";
}

export function formatSupportReceived(): string {
  return "Sua mensagem foi enviada! Um especialista entrará em contato em breve.";
}

export function formatShortTextWithDocs(): string {
  return "Já recebi seu conteúdo. Te chamo em breve pra praticar. Ou use *ajuda* para ver os comandos disponíveis.";
}

export function formatShortTextNoDocs(): string {
  return "Adicione um conteúdo para praticarmos durante o dia. Pode ser texto, áudio, imagem ou PDF.\n\n_Use *ajuda* para ver todos os comandos._";
}

export function formatPracticeComplete(): string {
  return "Você respondeu todas as perguntas dessa rodada. Manda novo conteúdo ou continue praticando.";
}

export function formatImageNoText(): string {
  return "Não encontrei conteúdo de texto suficiente nessa imagem. Manda o material como texto, áudio ou PDF.";
}

export function formatIntensiveModeActivated(): string {
  return "Modo intensivo ativado! Sua pergunta anterior ainda aguarda resposta.";
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
  return `${prefix} *${sanitizeWhatsappContent(title)}*`;
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
  docTitle: string;
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
    docTitle,
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
    leitura = "Você mal começou esse aqui.";
  } else if (taxa >= 0.8) {
    leitura = "Mandou bem nesse material.";
  } else if (taxa >= 0.5) {
    leitura = "Esse material rendeu, dá pra apertar mais.";
  } else {
    leitura = "Esse travou bastante. Vale revisar.";
  }

  return [
    `Enquanto a próxima pergunta não chega, segue um resumo do material anterior: *${docTitle}*`,
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
  "O cérebro esquece rápido sem prática.",
  "Você já começou, o mais difícil já passou.",
  "Consistência é o que separa quem aprende de quem tenta.",
  "Um pouquinho todo dia vale mais que muito de vez em quando.",
];

const NUDGE_CLOSING_POOL = [
  "É só responder.",
  "Quando puder, é só mandar.",
  "A pergunta continua aqui te esperando.",
  "Pode responder quando quiser.",
  "É só mandar quando estiver pronto.",
];

// fonte de verdade do texto real dos templates na Meta — alterar aqui antes de atualizar na Meta
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
    text: "Você não respondeu suas perguntas nos últimos 3 dias. Seu conteúdo segue disponível quando quiser.",
  },
  d7: {
    templateName: "nudge_d7",
    text: "Você não respondeu suas perguntas nos últimos 7 dias. Seu conteúdo segue disponível quando quiser.",
  },
  d14: {
    templateName: "nudge_d14",
    text: "Você não respondeu suas perguntas nos últimos 14 dias. Seu conteúdo segue disponível quando quiser.",
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
