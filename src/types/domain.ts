export type PlanCode = 'free' | 'pro'
export type ChannelType = 'whatsapp'
export type NoteType = 'text' | 'audio' | 'image'
export type MessageRole = 'user' | 'assistant'

export type MessageIntent =
  | 'save_note'
  | 'list_tags'
  | 'list_notes'
  | 'tag_notes'
  | 'search'
  | 'delete_note'
  | 'edit'
  | 'delete_tag'
  | 'edit_tag'
  | 'confirm'
  | 'list_commands'
  | 'pause_reviews'
  | 'referral'
  | 'invalid_command'
  | 'invalid_tag'

export type ParsedMessage = {
  intent: MessageIntent
  raw: string
  content?: string
  tags?: string[]
  searchQuery?: string
  noteId?: string
  tagName?: string
  tagNewName?: string
  editContent?: string
  notesFilter?: 'today' | 'yesterday' | 'week'
}

export type IncomingMessage = {
  channelId: string
  channelCode?: string
  channelType: ChannelType
  text?: string
  imageUrl?: string
  externalId?: string
  mediaType?: string
  mediaId?: string
  mediaMetadata?: Record<string, string | number | null>
}
