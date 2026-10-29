import { z } from "zod";
import type {
  ClientCommand,
  ClientCommandAction,
} from "../types/client-command";

const PAYLOAD_SCHEMAS: { [A in ClientCommandAction]: z.ZodTypeAny } = {
  open_create_activity: z.object({ prefill: z.string().min(1).optional() }),
  open_support: z.object({}),
  open_level: z.object({}),
};

const envelopeSchema = z.object({
  command: z.object({
    action: z.string(),
    payload: z.unknown(),
    replyTo: z.string().nullable(),
  }),
});

function isClientCommandAction(value: string): value is ClientCommandAction {
  return Object.prototype.hasOwnProperty.call(PAYLOAD_SCHEMAS, value);
}

// Action desconhecida (front antigo) ou payload invalido: ignora o comando.
export function parseClientCommand(metadata: unknown): ClientCommand | null {
  const envelope = envelopeSchema.safeParse(metadata);
  if (!envelope.success) return null;
  const { action, payload, replyTo } = envelope.data.command;
  if (!isClientCommandAction(action)) return null;
  const parsedPayload = PAYLOAD_SCHEMAS[action].safeParse(payload ?? {});
  if (!parsedPayload.success) return null;
  return { action, payload: parsedPayload.data, replyTo } as ClientCommand;
}

export function buildClientCommandMetadata(command: ClientCommand): {
  command: ClientCommand;
} {
  return { command };
}
