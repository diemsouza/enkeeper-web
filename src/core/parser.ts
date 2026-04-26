import { ParsedMessage } from '../types/domain'

export function extractTrailingTags(text: string): { content: string; tags: string[] } {
  const tokens = text.trim().split(/\s+/)
  let tagStart = tokens.length
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (/^#\w+$/.test(tokens[i])) {
      tagStart = i
    } else {
      break
    }
  }
  return {
    content: tokens.slice(0, tagStart).join(' '),
    tags: tokens.slice(tagStart).map(t => t.slice(1)),
  }
}

export function parseMessage(text: string): ParsedMessage {
  const raw = text
  const trimmed = text.trim()

  if (trimmed === '/') return { intent: 'list_commands', raw }
  if (trimmed === '#') return { intent: 'list_tags', raw }
  if (trimmed === '/notas') return { intent: 'list_notes', raw, notesFilter: 'all' }
  if (trimmed === '/notas ontem') return { intent: 'list_notes', raw, notesFilter: 'yesterday' }
  if (trimmed === '/notas semana') return { intent: 'list_notes', raw, notesFilter: 'week' }
  if (trimmed === '/pausar') return { intent: 'pause_reviews', raw }
  if (trimmed === '/indicar') return { intent: 'referral', raw }
  if (trimmed === '/confirmar') return { intent: 'confirm', raw }
  if (trimmed === '/cancelar') return { intent: 'cancel', raw }
  if (trimmed === '/suporte') return { intent: 'support', raw }

  if (trimmed.startsWith('/buscar ')) {
    const searchQuery = trimmed.slice('/buscar '.length).trim()
    return { intent: 'search', raw, searchQuery }
  }

  if (trimmed === '/excluir') return { intent: 'delete_note', raw }

  if (trimmed.startsWith('/excluir nota ')) {
    const noteId = trimmed.slice('/excluir nota '.length).trim()
    return { intent: 'delete_note', raw, noteId }
  }

  if (trimmed.startsWith('/excluir tag ')) {
    const tagName = trimmed.slice('/excluir tag '.length).trim().replace(/^#/, '')
    return { intent: 'delete_tag', raw, tagName }
  }

  if (trimmed === '/editar') return { intent: 'edit', raw }

  if (trimmed.startsWith('/editar nota ')) {
    const rest = trimmed.slice('/editar nota '.length).trim()
    const paraIdx = rest.indexOf(' para ')
    if (paraIdx === -1) {
      return { intent: 'edit_note_prompt', raw, noteId: rest }
    }
    const noteId = rest.slice(0, paraIdx).trim()
    const body = rest.slice(paraIdx + ' para '.length)
    const { content: editContent, tags } = extractTrailingTags(body)
    return { intent: 'edit', raw, noteId, editContent, tags }
  }

  if (trimmed.startsWith('/editar tag ')) {
    const rest = trimmed.slice('/editar tag '.length).trim()
    const paraIdx = rest.indexOf(' para ')
    if (paraIdx === -1) {
      const tagName = rest.replace(/^#/, '')
      return { intent: 'edit_tag_prompt', raw, tagName }
    }
    const tagName = rest.slice(0, paraIdx).trim().replace(/^#/, '')
    const tagNewName = rest.slice(paraIdx + ' para '.length).trim().replace(/^#/, '')
    return { intent: 'edit_tag', raw, tagName, tagNewName }
  }

  if (trimmed.startsWith('#') && !trimmed.slice(1).includes(' ') && trimmed.length > 1) {
    const tagName = trimmed.slice(1)
    return { intent: 'tag_notes', raw, tagName }
  }

  if (trimmed.startsWith('/')) return { intent: 'invalid_command', raw }
  if (trimmed.startsWith('#')) return { intent: 'invalid_tag', raw }

  const { content, tags } = extractTrailingTags(trimmed)
  return { intent: 'save_note', raw, content, tags }
}
