import { DomainId } from "../lib/constants";

export type PlanCode = "trial" | "pro";
export type ChannelType = "whatsapp";
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
  | "waiting_doc_replace"
  | "waiting_set_level"
  | "waiting_set_activity_domain"
  | "waiting_set_activity_topic"
  | "waiting_set_activity_focus"
  | "waiting_admin_send_message"
  | "set_level"
  | "new_activity"
  | "free_text"
  | "unknown_command"
  | "practice_now"
  | "pause_practice"
  | "image_blocked"
  | "image_unreadable";

export type FocusSuggestion = { key: string; label: string };

export type GeneratedDocMetadata = {
  domainKey: string;
  domain: string;
  topic: string;
  subtopics: string[];
  subtopic: string;
  focusKeys: string[];
  focus: string[];
};

export type NewActivityIntentData = {
  flow: "new_activity";
  domain?: DomainId;
  topics?: string[];
  topic?: string;
  focusSuggestions?: FocusSuggestion[];
  subtopics?: string[];
};

export type UserIntentMetadata = {
  intent_data: NewActivityIntentData;
};

export type CheckoutData = { url: string; expiresAt: string };

export type AdminSendMessageIntentData = {
  targetUserId: string;
  targetUserChannelId: string;
  targetChannelUserId: string;
  identifier: string;
};

export type ParsedMessage = {
  intent: MessageIntent;
  raw: string;
  content?: string;
  docIndex?: number;
};

export type IncomingMessage = {
  channelUserId: string;
  channelUserPhone?: string;
  channelUsername?: string;
  channelType: ChannelType;
  contactName?: string;
  text?: string;
  imageUrl?: string;
  externalId?: string;
  mediaType?: string;
  mediaId?: string;
  mediaMetadata?: Record<string, string | number | null>;
  isVoiceNote?: boolean;
  voiceAudioBuffer?: Buffer;
  voiceAudioMimeType?: string;
  referral?: Record<string, unknown> | null;
  receivedAt: Date;
};
