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
  | "set_level"
  | "new_activity"
  | "free_text"
  | "unknown_command"
  | "practice_now"
  | "pause_practice";

export type FocusSuggestion = { key: string; label: string };

export type NewActivityIntentData = {
  flow: "new_activity";
  domain?: DomainId;
  topic?: string;
  focusSuggestions?: FocusSuggestion[];
};

export type UserIntentMetadata = {
  intent_data: NewActivityIntentData;
};

export type ParsedMessage = {
  intent: MessageIntent;
  raw: string;
  content?: string;
  docIndex?: number;
};

export type IncomingMessage = {
  channelId: string;
  channelCode?: string;
  channelType: ChannelType;
  contactName?: string;
  text?: string;
  imageUrl?: string;
  externalId?: string;
  mediaType?: string;
  mediaId?: string;
  mediaMetadata?: Record<string, string | number | null>;
  receivedAt: Date;
};
