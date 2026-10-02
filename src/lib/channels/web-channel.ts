import { ulid } from "ulid";
import type { FormattedMessage } from "../../types/out-message";
import type {
  ChannelSendResult,
  MessageChannel,
  NudgeTemplate,
} from "../../types/message-channel";
import { broadcastRealtimeEvent } from "../../vendors/realtime.vendor";
import {
  REALTIME_MESSAGES_TOPIC_PREFIX,
  REALTIME_TYPING_EVENT,
} from "../constants";

async function broadcastTyping(userId: string, event: string): Promise<void> {
  try {
    await broadcastRealtimeEvent({
      topic: `${REALTIME_MESSAGES_TOPIC_PREFIX}${userId}`,
      event,
    });
  } catch (err) {
    // Indicador e cosmetico: falha no broadcast nao pode derrubar o envio.
    console.error(`[WebChannel] ${event} failed:`, err);
  }
}

// Sem entrega real: quem persiste a resposta do bot é o próprio
// handleIncomingMessage via sendAndSaveMessage, que só usa o externalId
// retornado aqui para gravar a Message. A mensagem chega ao cliente pelo
// broadcast do trigger de INSERT na tabela; o "digitando" é o único evento
// que o canal emite direto no Realtime.
export class WebChannel implements MessageChannel {
  async sendMessage(
    _to: string,
    _message: FormattedMessage,
  ): Promise<ChannelSendResult> {
    return { externalId: `web-${ulid()}` };
  }

  async sendTemplate(
    _to: string,
    _template: NudgeTemplate,
  ): Promise<ChannelSendResult> {
    return { externalId: `web-${ulid()}` };
  }

  async notifyTyping(userId: string): Promise<void> {
    await broadcastTyping(userId, REALTIME_TYPING_EVENT.START);
  }

  async notifyTypingStop(userId: string): Promise<void> {
    await broadcastTyping(userId, REALTIME_TYPING_EVENT.STOP);
  }
}
