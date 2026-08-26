export function splitContentIntoBlocks(content: string): string[] {
  return content.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
}

export function calculatePoolSize(content: string): number {
  const blocks = splitContentIntoBlocks(content);
  return Math.max(blocks.length, 10);
}
