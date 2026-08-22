export function pickSubtopic(
  subtopics: string[],
  lastSubtopic: string | null,
): string {
  const remaining = lastSubtopic
    ? subtopics.filter((s) => s !== lastSubtopic)
    : subtopics;
  const pool = remaining.length > 0 ? remaining : subtopics;
  return pool[Math.floor(Math.random() * pool.length)];
}
