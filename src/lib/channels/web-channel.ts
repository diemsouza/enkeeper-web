import { ulid } from "ulid";
import type { FormattedMessage } from "../../types/out-message";
import type {
  ChannelSendResult,
  MessageChannel,
  NudgeTemplate,
} from "../../types/message-channel";

// Sem entrega real: quem persiste a resposta do bot é o próprio
// handleIncomingMessage via sendAndSaveMessage, que só usa o externalId
// retornado aqui para gravar a Message. O cliente web lê a mensagem direto
// do banco depois, sem precisar de push/SSE.
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
}
