import { ParsedMessage } from '../types/domain'

export function parseMessage(text: string): ParsedMessage {
  const raw = text
  const trimmed = text.trim()

  if (trimmed === '/') return { intent: 'list_commands', raw }
  if (trimmed === '/docs') return { intent: 'list_docs', raw }
  if (trimmed === '/texto') return { intent: 'text_input', raw }
  if (trimmed === '/suporte') return { intent: 'support', raw }

  if (trimmed === '/sim') return { intent: 'confirm', raw }
  if (trimmed === '/não' || trimmed === '/nao') return { intent: 'cancel_no', raw }
  if (trimmed === '/cancelar') return { intent: 'cancel', raw }

  if (trimmed === '/pausar') return { intent: 'pause_doc', raw }
  if (trimmed.startsWith('/pausar ')) {
    const n = parseInt(trimmed.slice('/pausar '.length).trim(), 10)
    return { intent: 'pause_doc', raw, docIndex: isNaN(n) ? undefined : n }
  }

  if (trimmed === '/retomar') return { intent: 'resume_doc', raw }
  if (trimmed.startsWith('/retomar ')) {
    const n = parseInt(trimmed.slice('/retomar '.length).trim(), 10)
    return { intent: 'resume_doc', raw, docIndex: isNaN(n) ? undefined : n }
  }

  if (trimmed.startsWith('/')) return { intent: 'unknown_command', raw }

  return { intent: 'free_text', raw, content: trimmed }
}
