import type { MessageChannel } from "../../types/message-channel";
import { WebChannel } from "./web-channel";

export function resolveChannel(): MessageChannel {
  return new WebChannel();
}
