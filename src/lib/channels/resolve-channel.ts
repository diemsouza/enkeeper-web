import type { MessageChannel } from "../../types/message-channel";
import { WhatsAppChannel } from "./whatsapp-channel";
import { SimulatorChannel } from "./simulator-channel";

export function resolveChannel(): MessageChannel {
  if (process.env.SIMULATOR_MODE === "true") return new SimulatorChannel();
  return new WhatsAppChannel();
}
