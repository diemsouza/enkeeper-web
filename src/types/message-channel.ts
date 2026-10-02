import type { FormattedMessage } from "./out-message";

export type NudgeTemplate = string;

export type ChannelSendResult = {
  externalId: string | null;
};

export type TypingContext = {
  // WhatsApp: id da mensagem recebida do usuario (wamid); sem ele o canal
  // nao tem como mostrar o indicador.
  replyToMessageId?: string;
};

export type TypingTarget = TypingContext & { channel: MessageChannel };

export interface MessageChannel {
  sendMessage(to: string, message: FormattedMessage): Promise<ChannelSendResult>;
  sendTemplate(
    to: string,
    template: NudgeTemplate,
    bodyParams?: string[],
    buttonUrlParam?: string,
  ): Promise<ChannelSendResult>;
  notifyTyping(userId: string, ctx?: TypingContext): Promise<void>;
  notifyTypingStop(userId: string): Promise<void>;
}
