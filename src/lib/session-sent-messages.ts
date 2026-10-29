// externalIds enviados nesta aba. Vive no modulo: sobrevive a navegacao
// interna e zera no reload, que e o limite de execucao das mensagens de comando.
const sentExternalIds = new Set<string>();

export function markSentInSession(externalId: string): void {
  sentExternalIds.add(externalId);
}

// Consome: cada envio aceita uma unica mensagem de comando, entao remontar o
// chat (navegacao interna) nao executa de novo.
export function consumeSentInSession(externalId: string | null): boolean {
  if (externalId === null) return false;
  return sentExternalIds.delete(externalId);
}
