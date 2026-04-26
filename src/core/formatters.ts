export function formatTagList(
  tags: { name: string; noteCount: number }[],
): string {
  if (tags.length === 0) {
    return "Você ainda não tem tags. Adicione _#tags_ às suas notas!";
  }
  const lines = tags.map(
    (t) => `• #${t.name} (${t.noteCount} nota${t.noteCount !== 1 ? "s" : ""})`,
  );
  return `*Suas tags:*\n${lines.join("\n")}`;
}

export function formatTagNotes(
  notes: { content: string; noteType: "text" | "audio" | "image"; createdAt: Date }[],
  tagName: string,
): string {
  if (notes.length === 0) {
    return `Nenhuma nota encontrada com _#${tagName}_.`;
  }
  const lines = notes.map((n, i) => `${i + 1}. ${n.content}${originSuffix(n.noteType)}`);
  return `*Notas #${tagName}:*\n${lines.join("\n")}`;
}

export function formatSearchResults(
  notes: { content: string; noteType: "text" | "audio" | "image" }[],
  query: string,
): string {
  if (notes.length === 0) {
    return `Nenhuma nota encontrada para "${query}".`;
  }
  const lines = notes.map((n, i) => `${i + 1}. ${n.content}${originSuffix(n.noteType)}`);
  return `*Resultados para "${query}":*\n${lines.join("\n")}`;
}

function originSuffix(noteType: "text" | "audio" | "image"): string {
  if (noteType === "audio") return " (via áudio)";
  if (noteType === "image") return " (via imagem)";
  return "";
}

export function formatNoteSaved(
  tags: string[],
  totalDailyCount: number,
): string {
  const countLabel = `(${totalDailyCount} nota${totalDailyCount !== 1 ? "s" : ""} hoje)`;
  if (tags.length === 0) {
    return `*Nota salva!* ${countLabel}`;
  }
  const tagList = tags.map((t) => `#${t}`).join(", ");
  return `*Salvo em ${tagList}!* ${countLabel}`;
}

export function formatAudioNoteSaved(totalDailyCount: number): string {
  const countLabel = `(${totalDailyCount} nota${totalDailyCount !== 1 ? "s" : ""} hoje)`;
  return `✅ Nota salva via transcrição de áudio! ${countLabel}`;
}

export function formatImageNoteSaved(totalDailyCount: number): string {
  const countLabel = `(${totalDailyCount} nota${totalDailyCount !== 1 ? "s" : ""} hoje)`;
  return `✅ Nota salva via transcrição de imagem! ${countLabel}`;
}

export function formatNoteDeleted(content: string): string {
  return `Nota excluída: "${content}"`;
}

export function formatNoteEdited(content: string): string {
  return `Nota atualizada: "${content}"`;
}

export function formatDeleteNoteHelp(): string {
  return "Para excluir uma nota informe o número.\nExemplo: */excluir nota* 3\n\nUse */notas* para ver suas notas numeradas.";
}

export function formatEditNoteHelp(): string {
  return "Para editar uma nota informe o número e o novo texto.\nExemplo: */editar nota* 3 *para* novo texto #tag\n\nTags devem vir no final. Use */notas* para ver suas notas numeradas.";
}

export function formatDeleteTagConfirm(
  tagName: string,
  noteCount: number,
): string {
  return `A tag #${tagName} está em ${noteCount} nota${noteCount !== 1 ? "s" : ""}. As notas não serão excluídas, apenas a tag será removida delas.\n\nDigite /confirmar para excluir ou /cancelar para cancelar.`;
}

export function formatDeleteNotePrompt(content: string): string {
  return `Nota: "${content}"\n\nDigite /confirmar para excluir ou /cancelar para cancelar.`;
}

export function formatEditNotePrompt(content: string): string {
  return `Nota atual: "${content}"\n\nEscreva a nova nota com tags no final em uma única mensagem ou /cancelar para sair.`;
}

export function formatEditTagPrompt(tagName: string): string {
  return `Tag atual: #${tagName}\n\nEscreva o novo nome da tag em uma única mensagem ou /cancelar para sair.`;
}

export function formatSupportRequest(): string {
  return "Escreva em uma única mensagem como podemos ajudar, ex. Tenho uma dúvida sobre... ou Quero contratar plano Pro ou /cancelar para sair.";
}

export function formatSupportReceived(): string {
  return "Sua mensagem foi enviada para um especialista que entrará em contato assim que possível!";
}

export function formatTagDeleted(tagName: string): string {
  return `Tag #${tagName} excluída.`;
}

export function formatTagEdited(oldName: string, newName: string): string {
  return `Tag #${oldName} renomeada para #${newName}.`;
}

export function formatEditTagHelp(): string {
  return "Para renomear uma tag informe o nome atual e o novo nome.\nExemplos:\n*/editar tag* ingles *para* english\n*/editar tag* #ingles *para* #english";
}

export function formatConfirmNotFound(): string {
  return "Nenhuma ação pendente de confirmação.";
}

export function formatNoteIndexNotFound(): string {
  return "Número inválido. Use */notas* para ver suas notas numeradas.";
}

export function formatTagNotFound(tagName: string): string {
  return `Tag #${tagName} não encontrada.`;
}

export function formatInvalidCommand(): string {
  return "Comando inválido.\nDigite */* para ver os comandos disponíveis.";
}

export function formatInvalidTag(): string {
  return "Tag não reconhecida.\nDigite *#* para ver suas tags.";
}

export function formatUpgradePrompt(
  reason:
    | "audio"
    | "image"
    | "tag_limit"
    | "search"
    | "daily_limit"
    | "history",
): string {
  const messages: Record<typeof reason, string> = {
    audio:
      "Envio de áudio é exclusivo do plano Pro. Digite /suporte para saber mais.",
    image:
      "Envio de imagem é exclusivo do plano Pro. Digite /suporte para saber mais.",
    tag_limit:
      "Você atingiu o limite de tags do plano gratuito. Faça upgrade para adicionar mais! 🏷️",
    search: "Busca é um recurso Pro. Faça upgrade para desbloquear! 🔍",
    daily_limit:
      "Você atingiu o limite diário de notas do plano gratuito. Volte amanhã ou faça upgrade! 📝",
    history:
      "Acesso ao histórico completo é um recurso Pro. Faça upgrade para desbloquear! 📚",
  };
  return messages[reason];
}

export function formatCommandList(): string {
  return [
    "Comandos disponíveis:",
    "",
    "*/* — ver comandos",
    "*#* — suas tags",
    "*#ingles* — notas da tag",
    "",
    "*/buscar* welcome — buscar notas",
    "*/nota* 1 — ver nota completa",
    "*/notas* — últimas notas",
    "*/notas* (hoje, ontem ou semana) — notas por período",
    "",
    "*/editar nota* 1 — editar nota",
    "*/editar tag* #ingles — renomear tag",
    "*/excluir nota* 1 — excluir nota",
    "*/excluir tag* #ingles — excluir tag",
    "",
    "*/suporte* — falar com a gente",
    "",
    "Qualquer outro texto vira nota.",
    "_Tags no final: welcome #ingles_",
  ].join("\n");
}

export function formatNotesList(
  notes: {
    content: string;
    noteType: "text" | "audio" | "image";
    createdAt: Date;
    tags: string[];
  }[],
  filter: "today" | "yesterday" | "week" | "all",
): string {
  const emptyMessages = {
    today: "Nenhuma nota de hoje.",
    yesterday: "Nenhuma nota de ontem.",
    week: "Nenhuma nota nos últimos 7 dias.",
    all: "Nenhuma nota salva ainda.",
  };
  if (notes.length === 0) return emptyMessages[filter];

  const headers = {
    today: "📋 Notas de hoje:",
    yesterday: "📋 Notas de ontem:",
    week: "📋 Notas desta semana:",
    all: "📋 Últimas notas:",
  };

  const MAX = 20;
  const visible = notes.slice(0, MAX);
  const overflow = notes.length - MAX;

  const lines = visible.map((n, i) => {
    const tagSuffix =
      n.tags.length > 0 ? ` ${n.tags.map((t) => `#${t}`).join(" ")}` : "";
    return `${i + 1}. ${n.content}${originSuffix(n.noteType)}${tagSuffix}`;
  });

  const footer =
    overflow > 0
      ? `\n... e mais ${overflow} nota${overflow !== 1 ? "s" : ""}. Use */buscar* para encontrar notas específicas.`
      : "";

  return `*${headers[filter]}*\n${lines.join("\n")}${footer}`;
}

export function formatReferralMessage(referralCode: string): string {
  return `Convide amigos para o Enkeeper e ganhe benefícios!\n\nSeu código de indicação: \`${referralCode}\``;
}

export function formatPauseStub(): string {
  return "Em breve você poderá pausar suas revisões. Aguarde!";
}

export function formatOnboardingMessage(): string {
  return [
    "*Oi! Bem-vindo ao Enkeeper.*",
    "",
    "Aqui você anota tudo que é importante, precisa lembrar ou revisar depois.",
    "",
    "Envie qualquer palavra, frase, áudio ou imagem com texto que eu salvo pra você revisar depois.",
    "",
    "_Qualquer texto vira nota e qualquer palavra no final com # vira tag._",
  ].join("\n");
}
