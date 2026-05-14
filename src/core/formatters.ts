import { Doc, ActivityStatus } from "@prisma/client";
import { MAX_DOCS_PER_DAY } from "../lib/constants";
import { sanitizeWhatsappContent } from "../lib/utils";

export function formatOnboardingMsg1(): string {
  return "Hi! Bem-vindo ao *Dropuz*. 👋";
}

export function formatOnboardingMsg2(): string {
  return "Manda o material da sua aula de inglês como texto, foto ou PDF e recebe perguntas sobre ele ao longo do dia, aqui mesmo.";
}

export function formatOnboardingMsg3(): string {
  return "Você tem 24 horas pra sentir na prática. Aproveita!";
}

export function formatOnboardingMsg4(): string {
  return "Mande agora pra começar. Ou use */* pra ver os comandos disponíveis.";
}

export function formatPlanExpired(): string {
  return [
    "*Seu período de teste encerrou!*",
    "",
    "Para continuar praticando, assine o *Dropuz* por R$19,90/mês.",
    "",
    "_Use */suporte* para falar com a gente e ativar sua conta._",
  ].join("\n");
}

export function formatCommandList(): string {
  return [
    "*Comandos disponíveis:*",
    "",
    "*/ajuda* - ver essa lista de comandos",
    "*/praticar* - prática intensiva",
    "*/pausar* - pausar prática",
    "*/retomar* - retomar prática pausada",
    "*/conteudo* - seu conteúdo atual",
    "*/suporte* - fala com a equipe",
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

  lines.push("", "_Use */pausar* ou */retomar* para gerenciar._");

  return lines.join("\n");
}

export function formatNoDocs(): string {
  return "Você ainda não tem conteúdos.\nMande um texto, áudio, imagem ou PDF para começar.";
}

export function formatDocReceived(): string {
  return "Pronto. Em alguns minutos chega a primeira pergunta.";
}

export function formatDocConfirmPrompt(): string {
  return [
    "Esse parece ser um ótimo conteúdo para estudar. Quer usar?",
    "",
    "_Use */sim* para confirmar ou */não* para cancelar._",
  ].join("\n");
}

export function formatDocReplacePrompt(title: string): string {
  return [
    `Você já tem um conteúdo ativo: *"${title}"*.`,
    "",
    "Quer substituir pelo novo conteúdo? O atual será arquivado.",
    "",
    "_Use */sim* para substituir ou */não* para manter o atual._",
  ].join("\n");
}

export function formatDailyLimitReached(): string {
  return `Você atingiu o limite de ${MAX_DOCS_PER_DAY} conteúdos por dia. Tente novamente amanhã.`;
}

export function formatPausePrompt(docs: Pick<Doc, "id" | "title">[]): string {
  const lines = docs.map(
    (d, i) => `${i + 1}. ${d.title || "(processando...)"}`,
  );
  return `Qual conteúdo você quer pausar?\n\n${lines.join("\n")}\n\n_Digite o número ou use */cancelar*._`;
}

export function formatPauseSuccess(): string {
  return "Prática pausada. Use */retomar* quando quiser continuar.";
}

export function formatNoPausableDocs(): string {
  return "Nenhum conteúdo ativo no momento.";
}

export function formatResumePrompt(docs: Pick<Doc, "id" | "title">[]): string {
  const lines = docs.map(
    (d, i) => `${i + 1}. ${d.title || "(processando...)"}`,
  );
  return `Qual conteúdo você quer retomar?\n\n${lines.join("\n")}\n\n_Digite o número ou */cancelar*._`;
}

export function formatResumeSuccess(): string {
  return "Prática retomada. Vamos continuar de onde parou!";
}

export function formatNoPausedDocs(): string {
  return "Nenhum conteúdo pausado no momento.";
}

export function formatSupportRequest(): string {
  return "Escreva em uma única mensagem como podemos ajudar ou use */cancelar* para sair.";
}

export function formatSupportReceived(): string {
  return "Sua mensagem foi enviada! Um especialista entrará em contato em breve.";
}

export function formatShortTextWithDocs(): string {
  return "Já recebi seu conteúdo. Te chamo em breve pra praticar. Ou use */* para ver os comandos disponíveis.";
}

export function formatShortTextNoDocs(): string {
  return "Adicione um conteúdo para praticarmos durante o dia. Pode ser texto, áudio, imagem ou PDF.\n\n_Use */* para ver todos os comandos._";
}

export function formatPracticeComplete(): string {
  return "Você respondeu todas as perguntas dessa rodada. Manda novo conteúdo ou continue praticando.";
}

export function formatFirstPracticeNudge(): string {
  return "Ainda dá tempo de responder. Quando quiser, é só mandar.";
}

export function formatLastPracticeNudge(): string {
  return "Sua prática está pausada. Quando quiser continuar, é só responder ou mandar novo conteúdo.";
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

export function formatChoiceQuestion(question: string, options: string[]): string {
  if (!options.length) return question;
  const labels = "abcdefghij";
  return `${question}\n\n${options.map((o, i) => `${labels[i]}) ${o}`).join("\n")}`;
}

export function formatUpgradePrompt(reason: "audio" | "image"): string {
  const messages: Record<typeof reason, string> = {
    audio:
      "Envio de áudio é exclusivo do plano Pro. _Use */suporte* para saber mais._",
    image:
      "Envio de imagem é exclusivo do plano Pro. _Use */suporte* para saber mais._",
  };
  return messages[reason];
}
