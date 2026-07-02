import { SEQUENCE_WA_MESSAGE_INTERVAL_SEC } from "./constants";
import { MessagePart } from "../types/message-parts";
import { emitToSession } from "./simulator-emitter";

export async function sendSimulatorMessages(
  channelId: string,
  parts: MessagePart[],
): Promise<void> {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (typeof part === "object") {
      await new Promise((r) => setTimeout(r, part.delay * 1000));
      continue;
    }
    if (i > 0 && typeof parts[i - 1] === "string") {
      await new Promise((r) =>
        setTimeout(r, SEQUENCE_WA_MESSAGE_INTERVAL_SEC * 1000),
      );
    }
    emitToSession(channelId, {
      type: "message",
      text: part,
      time: new Date().toISOString(),
    });
  }
  emitToSession(channelId, { type: "done" });
}
