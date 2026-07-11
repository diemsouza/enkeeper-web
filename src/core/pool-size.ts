import { SectionType } from "../lib/prisma";

export function splitContentIntoBlocks(content: string): string[] {
  return content.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
}

export function calculatePoolSize(section: {
  sectionType: SectionType;
  content: string;
}): number {
  const blocks = splitContentIntoBlocks(section.content);

  if (section.sectionType === "text") {
    return Math.min(Math.max(blocks.length * 5, 5), 50);
  }

  return Math.max(blocks.length, 10);
}
