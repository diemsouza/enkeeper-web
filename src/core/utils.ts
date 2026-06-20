import { groupBy, shuffle } from "lodash";
import { SectionQuestionResult } from "../lib/llm-schemas";

function perceivedGroup(format: string): string {
  return format === "recall" || format === "recall_inverted"
    ? "recall_like"
    : format;
}

export function shuffleQuestions(
  questions: SectionQuestionResult[],
): SectionQuestionResult[] {
  const groups = groupBy(questions, (q) => q.questionFormat);

  const pools: Record<string, SectionQuestionResult[]> = {};
  const remaining: Record<string, number> = {};

  for (const [format, items] of Object.entries(groups)) {
    pools[format] = shuffle(items);
    remaining[format] = items.length;
  }

  const result: SectionQuestionResult[] = [];
  let lastGroup: string | null = null;

  while (Object.values(remaining).some((count) => count > 0)) {
    const candidates = shuffle(
      Object.entries(remaining).filter(([, count]) => count > 0),
    ).sort((a, b) => b[1] - a[1]);

    const choice =
      candidates.find(([format]) => perceivedGroup(format) !== lastGroup) ??
      candidates[0];

    const [format] = choice;
    const item = pools[format].pop()!;

    result.push(item);
    remaining[format] -= 1;
    lastGroup = perceivedGroup(format);
  }

  return result;
}
