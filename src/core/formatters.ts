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
  notes: { content: string; createdAt: Date }[],
  tagName: string,
): string {
  if (notes.length === 0) {
    return `Nenhuma nota encontrada com _#${tagName}_.`;
  }
  const lines = notes.map((n, i) => `${i + 1}. ${n.content}`);
  return `*Notas #${tagName}:*\n${lines.join("\n")}`;
}

export function formatSearchResults(
  notes: { content: string }[],
  query: string,
): string {
  if (notes.length === 0) {
    return `Nenhuma nota encontrada para "${query}".`;
  }
  const lines = notes.map((n, i) => `${i + 1}. ${n.content}`);
  return `*Resultados para "${query}":*\n${lines.join("\n")}`;
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

export function formatNoteDeleted(content: string): string {
  return `Nota excluída: "${content}"`;
}

export function formatNoteEdited(content: string): string {
  return `Nota atualizada: "${content}"`;
}

export function formatDeleteHelp(): string {
  return "Para excluir uma nota informe o número.\nExemplo: /excluir 5\n\n_Use /notas para ver suas notas com os números._";
}

export function formatEditHelp(): string {
  return "Para editar uma nota informe o número e o novo texto.\nExemplo: /editar 4 novo texto #tag\n\n_Use /notas para ver suas notas com os números._";
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
      "Transcrição de áudio é um recurso Pro. Faça upgrade para desbloquear! 🎙️",
    image:
      "Extração de texto de imagens é um recurso Pro. Faça upgrade para desbloquear! 🖼️",
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
    "*Comandos disponíveis:*",
    "• */* — lista de comandos",
    "• *#* — suas tags",
    "• *#nome* — notas com essa tag",
    "• */buscar <termo>* — buscar notas",
    "• */excluir <número>* — excluir nota",
    "• */editar <número> <conteúdo>* — editar nota",
    "• */notas* — ver notas de hoje",
    "• */notas ontem* — ver notas de ontem",
    "• */notas semana* — ver notas dos últimos 7 dias",
    "• */pausar* — pausar revisões",
    "• */indicar* — indicar amigos",
    "",
    "Para salvar uma nota, basta enviar o texto. Use _#tags_ para organizar!",
  ].join("\n");
}

export function formatNotesList(
  notes: {
    content: string;
    noteType: "text" | "audio" | "image";
    createdAt: Date;
    tags: string[];
  }[],
  filter: "today" | "yesterday" | "week",
): string {
  const emptyMessages = {
    today: "Nenhuma nota hoje.",
    yesterday: "Nenhuma nota ontem.",
    week: "Nenhuma nota nos últimos 7 dias.",
  };
  if (notes.length === 0) return emptyMessages[filter];

  const headers = {
    today: "📋 Notas de hoje:",
    yesterday: "📋 Notas de ontem:",
    week: "📋 Notas desta semana:",
  };

  const typeIcon: Record<"text" | "audio" | "image", string> = {
    text: "",
    audio: "🎵 ",
    image: "🖼️ ",
  };

  const MAX = 20;
  const visible = notes.slice(0, MAX);
  const overflow = notes.length - MAX;

  const lines = visible.map((n, i) => {
    const icon = typeIcon[n.noteType];
    const tagSuffix =
      n.tags.length > 0 ? ` [${n.tags.map((t) => `#${t}`).join(" ")}]` : "";
    return `${i + 1}. ${icon}${n.content}${tagSuffix}`;
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
