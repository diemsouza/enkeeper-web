import { ContentGroupId, ContentSubgroupId } from "../lib/constants";

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
  | "waiting_set_activity_group"
  | "waiting_set_activity_subgroup"
  | "waiting_set_activity_topic"
  | "set_level"
  | "new_activity"
  | "free_text"
  | "unknown_command"
  | "practice_now"
  | "pause_practice";

export type NewActivityIntentData = {
  flow: "new_activity";
  contentGroup?: ContentGroupId;
  contentSubgroup?: ContentSubgroupId;
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
