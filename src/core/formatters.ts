import { Doc, ActivityStatus, Level, QuestionFormat } from "../lib/prisma";
import {
  ANSWER_EMOJI,
  INTENSIVE_UNTIL_MIN,
  MAX_DOC_ITEMS_PER_DOC,
  TRIAL_DAYS,
} from "../lib/constants";
import {
  capitalizeFirst,
  sanitizeText,
  sanitizeWhatsappContent,
} from "../lib/utils";
import {
  AnswerEvaluationResult,
  SectionQuestionResult,
} from "../lib/llm-schemas";
import { shuffle } from "lodash";
import { format } from "date-fns";
import { CreateQuestionData } from "../repo/questions.repo";

export function formatOnboardingMsg1(): string {
  return "Hi 👋 Bem-vindo a *Fluizer*.";
}

export function formatOnboardingMsg2(): string {
  return "Pratique inglês no seu ritmo, com o material que fizer sentido pra você.";
}

export function formatOnboardingMsg3(): string {
  return "Envie imagem, PDF ou texto com conteúdo em inglês: algo que esteja lendo, página de livro, post nas redes sociais ou material de aula.";
}

export function formatOnboardingMsg4(): string {
  return "Estude o que você enviar. Ao longo do dia, chegam perguntas sobre ele, aqui mesmo.";
}

export function formatOnboardingMsg5(): string {
  return `Você tem ${TRIAL_DAYS} ${TRIAL_DAYS > 1 ? "dias" : "dia"} pra sentir o produto. Envie o material agora pra começar, ou use *ajuda* pra ver os comandos disponíveis.`;
}

export function formatMaterialGuidance(): string {
  return `Sem ideia do que enviar? Precisa ter texto em inglês suficiente para virar prática.\n\nFoto de página de livro, captura de tela de conversa, letra de música, post nas redes sociais, material de aula ou PDF.`;
}

export function formatNoActivity(): string {
  return [
    "Você ainda não tem atividade ativa.",
    "",
    formatMaterialGuidance(),
    "",
    "_Use *ajuda* para ver os comandos disponíveis._",
  ].join("\n");
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
    "_Envie texto, imagem ou PDF com conteúdo em inglês suficiente para virar prática._",
    ,
    ,
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

  if (current.length === 0 && archived.length === 0) return formatNoActivity();

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
        `_${format(a.updatedAt, "dd/MM")}_ - *${displayTitle}* \n${LEVEL_LABEL[a.userLevel]}`,
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
    "_Para criar uma atividade, envie texto, imagem ou PDF com conteúdo em inglês suficiente para virar prática._";
  if (textFooter) lines.push("", textFooter);

  return lines.join("\n");
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
  return "A próxima pergunta chega mais tarde, no ritmo normal. Use *praticar* e ative o modo intensivo agora.";
}

export function formatDocProcessingFailed(): string {
  return "Algo deu errado no processamento. Tente outro material.";
}

export function formatDocNoQuestions(): string {
  return "Não foi possível gerar perguntas a partir desse material. Tente outro material.";
}

export function formatIntensiveModeStopped(): string {
  return "Modo prática intensiva pausado. Voltando para o ritmo normal.";
}

export function formatDailyPracticeLimitReached(): string {
  return "Você usou toda sua prática intesiva disponível de hoje, mas amanhã tem mais.";
}

export function formatIntensiveDailyLimitReached(): string {
  return "Você atingiu o limite diário de prática intensiva. Sua prática ao longo do dia continua normal.";
}

export function formatDocConfirmPrompt(): string {
  return [
    "Esse material parece bom pra praticar. Quer começar uma nova atividade com ele?",
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
    "Você pode enviar mais materiais ou só aguardar. Use *cancelar* para descartar e começar de novo.";
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
  return "Atividade pausada. Use *retomar* para continuar.";
}

export function formatNoPausableDocs(): string {
  return "Nenhuma atividade ativa no momento.";
}

export function formatResumePrompt(docs: Pick<Doc, "id" | "title">[]): string {
  const lines = docs.map((d, i) => `${i + 1}. ${d.title || "Sem título"}`);
  return `Qual atividade você quer retomar?\n\n${lines.join("\n")}\n\n_Digite o número ou *cancelar*._`;
}

export function formatResumeSuccess(): string {
  return "Atividade retomada, de onde parou.";
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
  return "Material recebido. Aguarde ou use *ajuda* para ver os comandos disponíveis.";
}

export function formatShortTextNoDocs(): string {
  return "Envie um material para praticar durante o dia. Pode ser texto, imagem ou PDF.\n\n_Use *ajuda* para ver todos os comandos._";
}

export function formatRoundCompletedFallback(): string {
  return "Você concluiu as perguntas dessa atividade. Envie um novo material ou continue revisando no ritmo normal para fixar mais.";
}

export function getRoundCompletedReadingLine(right: number, responses: number) {
  const rate = responses > 0 ? right / responses : 0;

  let reading: string;
  let tip: string;

  if (responses < 5) {
    reading = "Poucas perguntas nessa rodada.";
    tip = "Seguindo, a leitura fica mais precisa.";
  } else if (rate >= 0.8) {
    reading = "Poucas respostas saíram erradas.";
    tip = "Ritmo bom, vale manter.";
  } else if (rate >= 0.5) {
    reading = "Resultado dividido entre certo e errado.";
    tip = "Dá pra seguir apertando esse conteúdo.";
  } else {
    reading = "A maioria das respostas ainda saiu errada.";
    tip = "Vale seguir firme nesse conteúdo.";
  }

  return { rate, reading, tip };
}

export function formatRoundCompletedSummary(data: {
  questionCount: number;
  right: number;
  responses: number;
}): string {
  const { questionCount, right, responses } = data;
  const { rate, reading, tip } = getRoundCompletedReadingLine(right, responses);
  const percentual = Math.round(rate * 100);

  return `Você concluiu as ${questionCount} perguntas dessa atividade, com ${percentual}% de acerto. ${reading} ${tip} Envie um novo material ou aguarde para continuar praticando.`;
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

  const { rate, reading, tip } = getActivitySummaryReadingLine(
    right,
    responses,
  );
  const wrongTotal = wrong + partial;
  const percentual = Math.round(rate * 100);

  const revisadasClause =
    revisadas > 0
      ? `${revisadas} ${revisadas === 1 ? "delas voltou" : "delas voltaram"} mais de uma vez antes de fixar. `
      : "";

  let body = `Em ${period}, você respondeu ${responses} das ${questionCount} perguntas dessa atividade, ${percentual}% de acerto (${right} certas e ${wrongTotal} erradas). ${revisadasClause}${reading} ${tip}`;
  if (responses > 0 && responses === questionCount) {
    body = `Em ${period}, você respondeu todas as${questionCount} perguntas dessa atividade, ${percentual}% de acerto. ${revisadasClause}${reading}`;
  }

  return [`📊 Atividade anterior: *${activityTitle}*`, "", body].join("\n");
}

export function formatImageNoText(): string {
  return "Não foi possível identificar texto em inglês suficiente nessa imagem. Envie outro material como texto, imagem ou PDF.";
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

export function formatCanceled(): string {
  return "Cancelado.";
}

export function formatLevelUpdateCanceled(): string {
  return "Atualização de nível cancelada.";
}

export function formatDocReplaceCanceled(): string {
  return "Ok, seguindo com a atividade atual.";
}

export function formatInvalidPauseIndex(): string {
  return "Número inválido. Use pausar para ver suas atividades ativas.";
}

export function formatInvalidResumeIndex(): string {
  return "Número inválido. Use retomar para ver suas atividades pausadas.";
}

export function formatNoActiveActivity(): string {
  return "Nenhuma atividade ativa no momento.";
}

export function formatAllQuestionsAnswered(): string {
  return "Todas as perguntas já foram respondidas.";
}

export function formatNoPendingAction(): string {
  return "Nenhuma ação pendente.";
}

export function formatFeedbackFailed(): string {
  return "Não foi possível avaliar essa resposta.";
}

export function formatPracticeWaiting(): string {
  return "Aguarde, a próxima mensagem chega em breve. Para mudar de atividade, envie um novo material.";
}

export function formatInternalSupportMessage(
  channelCode: string,
  planLabel: string,
  text: string,
): string {
  return `*Suporte*\n\nUsuário: ${channelCode}\nPlano: ${planLabel}\nMensagem: "${text}"`;
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
): string {
  const {
    status: evalStatus,
    feedback: agentFeedback,
    right_answer: rightAnswer,
    user_unknown: userUnknown,
  } = feedbackResult;

  const feedback = sanitizeText(agentFeedback);
  const emoji = ANSWER_EMOJI[evalStatus];
  const opening = getFeedbackOpening(evalStatus, !!userUnknown, level);

  const result = [];
  if (emoji) result.push(emoji);
  if (opening) result.push(opening);
  if (evalStatus !== "right" && rightAnswer)
    result.push(`"${capitalizeFirst(rightAnswer)}".`);
  if (feedback)
    result.push(feedback.indexOf('"') === -1 ? `"${feedback}"` : feedback);

  return result.join(" ");
}

export function formatQuestion(
  data: SectionQuestionResult,
): CreateQuestionData {
  const result = {
    question: sanitizeText(data.question),
    answerKeys: data.answerKeys.map((k) => sanitizeText(k)),
    questionFormat: data.questionFormat as QuestionFormat,
    questionOptions:
      data.questionFormat === QuestionFormat.choice
        ? shuffle(data.questionOptions.map((o) => sanitizeText(o)))
        : [],
  };
  return result;
}
