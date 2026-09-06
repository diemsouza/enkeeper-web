import type { FormattedMessageButton } from "@/src/types/out-message";

export type { FormattedMessageButton };

export interface Message {
  id: string;
  from: "user" | "bot";
  text?: string;
  time: string;
  type?: "file" | "audio" | "voice" | "image";
  fileName?: string;
  fileSize?: string;
  mediaType?: "image" | "pdf" | "text";
  audioUrl?: string;
  imageUrl?: string;
  caption?: string;
  textFallback?: string;
  externalId?: string;
  duration?: string;
  interactive?: { body: string; buttons: FormattedMessageButton[] } | null;
}
