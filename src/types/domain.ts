export type PlanCode = 'free' | 'pro'
export type ChannelType = 'whatsapp'
export type NoteType = 'text' | 'audio' | 'image'

export type MessageIntent =
  | 'save_note'
  | 'list_tags'
  | 'tag_notes'
  | 'search'
  | 'delete'
  | 'edit'
  | 'list_commands'
  | 'pause_reviews'
  | 'referral'

export type ParsedMessage = {
  intent: MessageIntent
  raw: string
  content?: string
  tags?: string[]
  searchQuery?: string
  noteId?: string
  tagName?: string
  editContent?: string
}

export type IncomingMessage = {
  channelId: string
  channelCode?: string
  channelType: ChannelType
  text?: string
  audioUrl?: string
  imageUrl?: string
}
