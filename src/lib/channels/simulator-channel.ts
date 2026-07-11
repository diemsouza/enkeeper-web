import { DEFAULT_MESSAGE_INTERVAL_SEC } from "../constants";
import type { OutMessage } from "../../types/out-message";
import type { MessageChannel, NudgeTemplate } from "../../types/message-channel";
import { emitToSession } from "../simulator-emitter";

export class SimulatorChannel implements MessageChannel {
  async sendMessage(to: string, messages: OutMessage | OutMessage[]): Promise<void> {
    const parts = Array.isArray(messages) ? messages : [messages];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (typeof part === "object") {
        await new Promise((r) => setTimeout(r, part.delay * 1000));
        continue;
      }
      if (i > 0 && typeof parts[i - 1] === "string") {
        await new Promise((r) =>
          setTimeout(r, DEFAULT_MESSAGE_INTERVAL_SEC * 1000),
        );
      }
      emitToSession(to, {
        type: "message",
        text: part,
        time: new Date().toISOString(),
      });
    }
  }

  // no-op: nudge templates don't have accessible text in the cron context;
  // the cron persists the nudge text separately for display via sendMessage
  async sendTemplate(_to: string, _template: NudgeTemplate): Promise<void> {}
}
