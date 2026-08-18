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
};

export const COMMANDS: Command[] = [
  {
    id: "help",
    display: "ajuda",
    aliases: ["help", "menu", "comandos"],
    strictMode: true,
  },
  {
    id: "practice_now",
    display: "praticar",
    aliases: ["practice", "praticar agora"],
    strictMode: true,
  },
  {
    id: "pause",
    display: "pausar",
    aliases: ["pause", "parar"],
    strictMode: true,
  },
  {
    id: "resume",
    display: "retomar",
    aliases: ["resume", "continuar", "voltar"],
    strictMode: true,
  },
  {
    id: "list_activities",
    display: "atividade",
    aliases: ["atividades", "minhas atividades", "status"],
    strictMode: true,
  },
  {
    id: "new_activity",
    display: "nova atividade",
    aliases: [
      "trocar atividade",
      "trocar de atividade",
      "mudar atividade",
      "mudar de atividade",
      "criar atividade",
      "new activity",
    ],
    strictMode: true,
  },
  {
    id: "set_level",
    display: "nivel",
    aliases: [
      "level",
      "mudar nivel",
      "mudar de nivel",
      "trocar nivel",
      "trocar de nivel",
      "set level",
    ],
    strictMode: true,
  },
  {
    id: "support",
    display: "suporte",
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
  },
  {
    id: "cancel",
    display: "cancelar",
    aliases: ["cancel", "sair", "parar fluxo"],
    // Dentro de um fluxo de confirmacao (nova atividade, nivel) e exibido
    // sem "/" -- usar formatCommand("cancel", { strictMode: false }) nesses casos.
    strictMode: true,
  },
  {
    id: "confirm_yes",
    display: "sim",
    aliases: ["yes", "ok", "confirmar"],
    strictMode: false,
  },
  {
    id: "confirm_no",
    display: "não",
    aliases: ["no", "negativo"],
    strictMode: false,
  },
  {
    id: "admin",
    display: "admin",
    // Comando interno, staff-only (gated por WA_SUPPORT em message-service.ts).
    // Subcomandos (help/users/upgrade/expire/extend/info) sao argumentos,
    // nao aliases -- ver admin-service.ts.
    aliases: [],
    strictMode: true,
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
  return strict ? `\`/${command.display}\`` : `\`${command.display}\``;
}
