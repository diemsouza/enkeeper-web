export function sanitizeNoteContent(text: string): string {
  return text.replace(/[*_~`[\]]/g, "");
}
