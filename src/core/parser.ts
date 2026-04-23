import { MessageIntent, ParsedMessage } from '../types/domain'

function extractTags(text: string): string[] {
  const tags: string[] = []
  const pattern = /#(\w+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    tags.push(match[1])
  }
  return tags
}

function removeTags(text: string): string {
  return text.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim()
}

export function parseMessage(text: string): ParsedMessage {
  const raw = text
  const trimmed = text.trim()

  if (trimmed === '/') {
    return { intent: 'list_commands', raw }
  }

  if (trimmed === '#') {
    return { intent: 'list_tags', raw }
  }

  if (trimmed === '/notas') {
    return { intent: 'list_notes', raw, notesFilter: 'today' }
  }

  if (trimmed === '/notas ontem') {
    return { intent: 'list_notes', raw, notesFilter: 'yesterday' }
  }

  if (trimmed === '/notas semana') {
    return { intent: 'list_notes', raw, notesFilter: 'week' }
  }

  if (trimmed === '/pausar') {
    return { intent: 'pause_reviews', raw }
  }

  if (trimmed === '/indicar') {
    return { intent: 'referral', raw }
  }

  if (trimmed.startsWith('/buscar ')) {
    const searchQuery = trimmed.slice('/buscar '.length).trim()
    return { intent: 'search', raw, searchQuery }
  }

  if (trimmed === '/excluir') {
    return { intent: 'delete_note', raw }
  }

  if (trimmed.startsWith('/excluir ')) {
    const noteId = trimmed.slice('/excluir '.length).trim()
    return { intent: 'delete_note', raw, noteId }
  }

  if (trimmed === '/editar') {
    return { intent: 'edit', raw }
  }

  if (trimmed.startsWith('/editar ')) {
    const rest = trimmed.slice('/editar '.length).trim()
    const spaceIdx = rest.indexOf(' ')
    if (spaceIdx === -1) {
      return { intent: 'edit', raw, noteId: rest, editContent: '', tags: [] }
    }
    const noteId = rest.slice(0, spaceIdx)
    const body = rest.slice(spaceIdx + 1)
    const tags = extractTags(body)
    const editContent = removeTags(body)
    return { intent: 'edit', raw, noteId, editContent, tags }
  }

  if (trimmed.startsWith('#') && !trimmed.slice(1).includes(' ') && trimmed.length > 1) {
    const tagName = trimmed.slice(1)
    return { intent: 'tag_notes', raw, tagName }
  }

  const tags = extractTags(trimmed)
  const content = removeTags(trimmed)
  return { intent: 'save_note', raw, content, tags }
}
