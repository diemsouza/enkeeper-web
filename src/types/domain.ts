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
  | "awaiting_doc_confirm"
  | "awaiting_doc_replace"
  | "awaiting_pause_select"
  | "awaiting_resume_select"
  | "awaiting_level_set"
  | "set_level"
  | "free_text"
  | "unknown_command"
  | "practice_now"
  | "pause_practice";

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
};
