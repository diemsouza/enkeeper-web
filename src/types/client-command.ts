// Mensagem de comando: o servidor salva como Message (intent "client_command",
// comando em metadata.command) e o front executa sem mostrar balao. Nova
// action = uma entrada aqui, o schema em src/core/client-command.ts e um
// handler no LiveThreadClient.
export type ClientCommandPayloads = {
  open_create_activity: { prefill?: string };
  open_support: Record<string, never>;
  open_level: Record<string, never>;
};

export type ClientCommandAction = keyof ClientCommandPayloads;

export type ClientCommand<A extends ClientCommandAction = ClientCommandAction> =
  {
    [K in A]: {
      action: K;
      payload: ClientCommandPayloads[K];
      replyTo: string | null;
    };
  }[A];

export const CLIENT_COMMAND_INTENT = "client_command";
