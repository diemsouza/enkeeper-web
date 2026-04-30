import { ParsedMessage } from '../types/domain'

function normalize(s: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function parseMessage(text: string): ParsedMessage {
  const raw = text;
  const trimmed = text.trim();
  const n = normalize(trimmed);

  if (n === '/') return { intent: 'list_commands', raw };
  if (n === '/conteudo') return { intent: 'list_docs', raw };
  if (n === '/suporte') return { intent: 'support', raw };

  if (n === '/sim') return { intent: 'confirm', raw };
  if (n === '/nao') return { intent: 'cancel_no', raw };
  if (n === '/cancelar') return { intent: 'cancel', raw };

  if (n === '/pausar') return { intent: 'pause_doc', raw };
  if (n.startsWith('/pausar ')) {
    const num = parseInt(n.slice('/pausar '.length).trim(), 10);
    return { intent: 'pause_doc', raw, docIndex: isNaN(num) ? undefined : num };
  }

  if (n === '/retomar') return { intent: 'resume_doc', raw };
  if (n.startsWith('/retomar ')) {
    const num = parseInt(n.slice('/retomar '.length).trim(), 10);
    return { intent: 'resume_doc', raw, docIndex: isNaN(num) ? undefined : num };
  }

  if (n.startsWith('/')) return { intent: 'unknown_command', raw };

  return { intent: 'free_text', raw, content: trimmed };
}
