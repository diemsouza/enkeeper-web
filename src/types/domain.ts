import { SubscriptionInterval } from "../lib/constants";
import type { ResolvedActivityRequest } from "../core/activity-request";

export type PlanCode = "trial" | "pro";
export type ChannelType = "whatsapp" | "web";
export type MessageRole = "user" | "assistant";

export type MessageIntent =
  | "list_commands"
  | "list_activities"
  | "pause_activity"
  | "resume_activity"
  | "support"
  | "confirm"
  | "cancel"
  | "cancel_no"
  | "waiting_admin_send_message"
  | "set_level"
  | "new_activity"
  | "free_text"
  | "unknown_command"
  | "practice_now"
  | "pause_practice";

export type GeneratedDocMetadata = {
  domainKey: string;
  domain: string;
  topic: string;
  subtopics: string[];
  subtopic: string;
  focusKeys: string[];
  focus: string[];
};

export type UserActivityCreationMetadata = {
  lastActivityRequest: ResolvedActivityRequest | null;
  activityCreatingAt: string | null;
};

export type CheckoutData = {
  url: string;
  expiresAt: string;
  interval: SubscriptionInterval;
};

export type UserSignedLinkMetadata = {
  signedLinkToken: string;
  signedLinkExpiresAt: string;
};

export type AdminSendMessageIntentData = {
  targetUserId: string;
  identifier: string;
};

export type ParsedMessage = {
  intent: MessageIntent;
  raw: string;
  content?: string;
  docIndex?: number;
};

export type IncomingMessage = {
  userId: string;
  text?: string;
  imageUrl?: string;
  externalId?: string;
  mediaType?: string;
  mediaId?: string;
  mediaMetadata?: Record<string, string | number | null>;
  isVoiceNote?: boolean;
  // Id pre-gerado da mensagem quando a Media (audio) e criada antes dela.
  messageId?: string;
  // Id do botao clicado na web e da mensagem da lista a que ele pertence.
  buttonId?: string;
  buttonMessageId?: string;
  receivedAt: Date;
};
