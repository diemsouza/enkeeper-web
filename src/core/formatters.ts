import { Doc } from "@prisma/client";

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
    "_Mande agora pra começar. Ou digite */* para ver os comandos disponíveis._",
  ].join("\n");
}

export function formatTrialWelcome(): string {
  return "Você tem acesso completo ao *Dropuz Pro* por 24 horas. Aproveite para mandar seu primeiro conteúdo e sentir na prática.";
}

export function formatPlanExpired(): string {
  return [
    "Seu período de teste encerrou. 🔒",
    "",
    "Para continuar praticando, assine o Dropuz Pro por R$19,90/mês.",
    "",
    "_Digite */suporte* para falar com a gente e ativar sua conta._",
  ].join("\n");
}

export function formatCommandList(): string {
  return [
    "*Comandos disponíveis:*",
    "",
    "*/* - ver essa lista de comandos",
    "*/docs* - seus conteúdos",
    "*/pausar* - pausar prática",
    "*/retomar* - retomar prática pausada",
    "*/texto* - adicionar conteúdo de texto",
    "*/suporte* - falar com suporte",
    "",
    "_Mande um texto, áudio, imagem ou PDF para começar uma prática sem usar os comandos._",
  ].join("\n");
}

export function formatDocsList(
  docs: Pick<Doc, "id" | "title" | "status">[],
): string {
  const visible = docs.filter((d) => d.status !== "archived");
  if (visible.length === 0) return formatNoDocs();
  const lines = visible.map(
    (d, i) =>
      `${i + 1}. ${d.title || "(processando...)"} — ${d.status === "active" ? "ativo" : "pausado"}`,
  );
  return `*Seus conteúdos:*\n\n${lines.join("\n")}\n\n_Digite */pausar* ou */retomar* para gerenciar._`;
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
    "_Digite */sim* para confirmar ou */não* para cancelar._",
  ].join("\n");
}

export function formatDocReplacePrompt(title: string): string {
  return [
    `Você já tem um conteúdo ativo: *"${title}"*.`,
    "",
    "Quer substituir pela nova prática? O conteúdo atual será arquivado.",
    "",
    "_Digite */sim* para substituir ou */não* para manter o atual._",
  ].join("\n");
}

export function formatTextInputPrompt(): string {
  return [
    "Cole o conteúdo que quer praticar. Pode ser trecho de aula, artigo, resumo, qualquer coisa que esteja estudando.",
    "",
    "_Digite */cancelar* para desistir._",
  ].join("\n");
}

export function formatDailyLimitReached(): string {
  return "Você atingiu o limite de 5 conteúdos por dia. Tente novamente amanhã.";
}

export function formatPausePrompt(docs: Pick<Doc, "id" | "title">[]): string {
  const lines = docs.map(
    (d, i) => `${i + 1}. ${d.title || "(processando...)"}`,
  );
  return `Qual conteúdo você quer pausar?\n\n${lines.join("\n")}\n\n_Digite o número ou */cancelar*._`;
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
  return "No momento programado te chamo para conversarmos sobre seu conteúdo. Ou digite */* para ver os comandos disponíveis.";
}

export function formatShortTextNoDocs(): string {
  return "Adicione um conteúdo para praticarmos durante o dia. Pode ser texto, áudio, imagem ou PDF. Ou digite */* para ver todos os comandos.";
}

export function formatUpgradePrompt(reason: "audio" | "image"): string {
  const messages: Record<typeof reason, string> = {
    audio:
      "Envio de áudio é exclusivo do plano Pro. _Digite */suporte* para saber mais._",
    image:
      "Envio de imagem é exclusivo do plano Pro. _Digite */suporte* para saber mais._",
  };
  return messages[reason];
}
