import { ulid } from "ulid";
import type { OutMessage } from "../../types/out-message";
import type {
  ChannelSendResult,
  MessageChannel,
  NudgeTemplate,
} from "../../types/message-channel";
import { emitToSession } from "../simulator-emitter";

export class SimulatorChannel implements MessageChannel {
  async sendMessage(to: string, message: OutMessage): Promise<ChannelSendResult> {
    const externalId = `simulator-${ulid()}`;
    if (typeof message === "object") {
      emitToSession(to, {
        type: "audio",
        audioPath: message.audioPath,
        time: new Date().toISOString(),
        externalId,
      });
    } else {
      emitToSession(to, {
        type: "message",
        text: message,
        time: new Date().toISOString(),
        externalId,
      });
    }
    return { externalId };
  }

  // no-op: nudge templates don't have accessible text in the cron context;
  // the cron persists the nudge text separately for display via sendMessage
  async sendTemplate(_to: string, _template: NudgeTemplate): Promise<ChannelSendResult> {
    return { externalId: `simulator-${ulid()}` };
  }
}
