import { Doc, ActivityStatus } from "@prisma/client";

export function formatOnboardingMessage(): string {
  return [
    "Olá! Bem-vindo ao *Dropuz*. 👋",
    "",
    "Seu conteúdo de estudo, ativo o dia inteiro no WhatsApp.",
    "",
    "Mande o conteúdo do seu interesse - texto, áudio, foto ou PDF. Pode ser aula de inglês, lista de questões, capítulo de livro, resumo de matéria.",
    "",
    "No seu ritmo, durante o dia, as mensagens chegam pra você praticar.",
    "",
    "_Mande agora pra começar. Ou use */* para ver os comandos disponíveis._",
  ].join("\n");
}

export function formatTrialWelcome(): string {
  return "Você tem acesso completo ao *Dropuz* por 24 horas. Aproveite para mandar seu primeiro conteúdo e sentir na prática.";
}

export function formatPlanExpired(): string {
  return [
    "Seu período de teste encerrou. 🔒",
    "",
    "Para continuar praticando, assine o Dropuz por R$19,90/mês.",
    "",
    "_Use */suporte* para falar com a gente e ativar sua conta._",
  ].join("\n");
}

export function formatCommandList(): string {
  return [
    "*Comandos disponíveis:*",
    "",
    "*/* - ver essa lista de comandos",
    "*/conteudo* - seu conteúdo atual",
    "*/pausar* - pausar prática",
    "*/retomar* - retomar prática pausada",
    "*/suporte* - falar com suporte",
    "",
    "_Mande um texto, áudio, imagem ou PDF para começar uma prática sem usar os comandos._",
  ].join("\n");
}

type ActivityDocItem = {
  status: ActivityStatus;
  doc: Pick<Doc, "id" | "title" | "status">;
};

export function formatDocsList(activities: ActivityDocItem[]): string {
  const current = activities.filter((a) => a.status === "active");
  const archived = activities.filter((a) => a.status === "archived").slice(0, 3);

  if (current.length === 0 && archived.length === 0) return formatNoDocs();

  const lines: string[] = [];

  if (current.length > 0) {
    lines.push("*Conteúdo atual:*", "");
    current.forEach((a) => {
      const label = a.doc.status === "paused" ? "pausado" : "ativo";
      lines.push(`• ${a.doc.title || "(processando...)"} - ${label}`);
    });
  }

  if (archived.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("*Arquivados:*", "");
    archived.forEach((a) => lines.push(`• ${a.doc.title || "(sem título)"}`));
  }

  lines.push("", "_Use */pausar* ou */retomar* para gerenciar._");

  return lines.join("\n");
}

export function formatNoDocs(): string {
  return "Você ainda não tem conteúdos.\nMande um texto, áudio, imagem ou PDF para começar.";
}

export function formatDocReceived(): string {
  return "Recebido! Estou preparando seu conteúdo. Em breve te mando a primeira mensagem sobre ele.";
}

export function formatDocConfirmPrompt(): string {
  return [
    "Esse texto tem conteúdo suficiente para virar sua prática do dia. Quer usar?",
    "",
    "_Use */sim* para confirmar ou */não* para cancelar._",
  ].join("\n");
}

export function formatDocReplacePrompt(title: string): string {
  return [
    `Você já tem um conteúdo ativo: *"${title}"*.`,
    "",
    "Quer substituir pela nova prática? O conteúdo atual será arquivado.",
    "",
    "_Use */sim* para substituir ou */não* para manter o atual._",
  ].join("\n");
}

export function formatDailyLimitReached(): string {
  return "Você atingiu o limite de 5 conteúdos por dia. Tente novamente amanhã.";
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
  return "Prática retomada. As perguntas voltam no próximo horário programado.";
}

export function formatNoPausedDocs(): string {
  return "Nenhum conteúdo pausado no momento.";
}

export function formatSupportRequest(): string {
  return "Escreva em uma única mensagem como podemos ajudar ou */cancelar* para sair.";
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

export function formatPracticeNudge(): string {
  return "Oi! Vi que não respondeu a última mensagem. Sem pressão, quando quiser continuar é só responder ou subir um novo conteúdo.";
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
