export type PlanCode = 'trial' | 'pro'
export type ChannelType = 'whatsapp'
export type MessageRole = 'user' | 'assistant'

export type MessageIntent =
  | 'list_commands'
  | 'list_docs'
  | 'pause_doc'
  | 'resume_doc'
  | 'support'
  | 'confirm'
  | 'cancel'
  | 'cancel_no'
  | 'awaiting_doc_confirm'
  | 'awaiting_doc_replace'
  | 'awaiting_pause_select'
  | 'awaiting_resume_select'
  | 'free_text'
  | 'unknown_command'

export type ParsedMessage = {
  intent: MessageIntent
  raw: string
  content?: string
  docIndex?: number
}

export type IncomingMessage = {
  channelId: string
  channelCode?: string
  channelType: ChannelType
  contactName?: string
  text?: string
  imageUrl?: string
  externalId?: string
  mediaType?: string
  mediaId?: string
  mediaMetadata?: Record<string, string | number | null>
}
