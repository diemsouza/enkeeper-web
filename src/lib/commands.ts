export type CommandId =
  | "help"
  | "practice_now"
  | "pause"
  | "resume"
  | "list_activities"
  | "new_activity"
  | "set_level"
  | "support"
  | "cancel"
  | "confirm_yes"
  | "confirm_no"
  | "admin";

export type Command = {
  id: CommandId;
  display: string;
  aliases: string[];
  strictMode: boolean;
  description: string;
  // Ausente = true. false remove o comando do menu de ajuda e do autocomplete.
  autoComplete?: boolean;
};

export const COMMANDS: Command[] = [
  {
    id: "help",
    display: "Ajuda",
    aliases: ["help", "menu"],
    strictMode: true,
    description: "Ver essa lista de comandos",
    // Fora do autocomplete e da lista que ele mesmo gera.
    autoComplete: false,
  },
  {
    id: "practice_now",
    display: "Praticar",
    aliases: ["modo intensivo"],
    strictMode: true,
    description: "Prática intensiva",
  },
  {
    id: "pause",
    display: "Pausar",
    aliases: ["parar"],
    strictMode: true,
    description: "Pausar atividade ou prática intensiva em andamento",
  },
  {
    id: "resume",
    display: "Retomar",
    aliases: ["retomar atividade", "voltar atividade"],
    strictMode: true,
    description: "Retomar atividade pausada",
  },
  {
    id: "list_activities",
    display: "Atividade",
    aliases: ["atividades", "minha atividade", "minhas atividades", "status"],
    strictMode: true,
    description: "Sua atividade atual",
  },
  {
    id: "new_activity",
    display: "Nova Atividade",
    aliases: [
      "trocar atividade",
      "trocar de atividade",
      "mudar atividade",
      "mudar de atividade",
      "criar atividade",
      "criar nova atividade",
    ],
    strictMode: true,
    description: "Cria uma atividade com tema gerado por você",
  },
  {
    id: "set_level",
    display: "Nível",
    aliases: [
      "mudar nivel",
      "mudar de nivel",
      "trocar nivel",
      "trocar de nivel",
    ],
    strictMode: true,
    // formatCommandList injeta o nível atual do usuário; esse texto é o fallback.
    description: "Define o nível do seu inglês",
  },
  {
    id: "support",
    display: "Suporte",
    aliases: [
      "support",
      "ajuda humana",
      "falar com humano",
      "atendente",
      "falar com atendente",
      "falar com suporte",
      "falar com suporte humano",
    ],
    strictMode: true,
    description: "Fala com a equipe",
  },
  {
    id: "cancel",
    display: "Cancelar",
    aliases: ["sair"],
    // Dentro de um fluxo de confirmacao (nova atividade, nivel) e exibido
    // sem "/" -- usar formatCommand("cancel", { strictMode: false }) nesses casos.
    strictMode: true,
    description: "Sai do fluxo ou ação em andamento",
    autoComplete: false,
  },
  {
    id: "confirm_yes",
    display: "Sim",
    aliases: ["yes", "ok", "confirmar", "sim, continuar", "continuar"],
    strictMode: false,
    description: "Confirma a ação pendente",
    autoComplete: false,
  },
  {
    id: "confirm_no",
    display: "Não",
    aliases: ["no", "negativo", "não, cancelar"],
    strictMode: false,
    description: "Recusa a ação pendente",
    autoComplete: false,
  },
  {
    id: "admin",
    display: "Admin",
    // Comando interno, staff-only (gated por WA_SUPPORT em message-service.ts).
    // Subcomandos (help/users/upgrade/expire/extend/info) sao argumentos,
    // nao aliases -- ver admin-service.ts.
    aliases: [],
    strictMode: true,
    description: "Comando interno de staff",
    autoComplete: false,
  },
];

function normalize(s: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function resolveCommand(input: string): CommandId | null {
  const stripped = input.trim().replace(/^\//, "");
  const normalized = normalize(stripped);
  for (const command of COMMANDS) {
    if (normalize(command.display) === normalized) return command.id;
    if (command.aliases.some((alias) => normalize(alias) === normalized)) {
      return command.id;
    }
  }
  return null;
}

export function formatCommand(
  id: CommandId,
  opts?: { strictMode?: boolean },
): string {
  const command = COMMANDS.find((c) => c.id === id);
  if (!command) throw new Error(`Comando desconhecido: ${id}`);
  const strict = opts?.strictMode ?? command.strictMode;
  return strict
    ? `\`/${command.display?.toLocaleLowerCase()}\``
    : `\`${command.display?.toLocaleLowerCase()}\``;
}

export function isAutoCompletable(command: Command): boolean {
  return command.strictMode && command.autoComplete !== false;
}

type CommandMatch = { command: Command; rank: number };

export function searchAutoCompleteCommands(query: string): Command[] {
  const normalized = normalize(query.trim().replace(/^\//, ""));
  const candidates = COMMANDS.filter(isAutoCompletable);
  if (!normalized) return candidates;

  const matches: CommandMatch[] = [];
  for (const command of candidates) {
    const display = normalize(command.display);
    const aliases = command.aliases.map(normalize);
    let rank: number;
    if (display.startsWith(normalized)) rank = 0;
    else if (aliases.some((a) => a.startsWith(normalized))) rank = 1;
    else if (display.includes(normalized)) rank = 2;
    else if (aliases.some((a) => a.includes(normalized))) rank = 3;
    else continue;
    matches.push({ command, rank });
  }

  return matches.sort((a, b) => a.rank - b.rank).map((m) => m.command);
}
