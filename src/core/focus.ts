import { FOCUS_ENUM, FocusCategory } from "../lib/constants";

const CATEGORY_LABEL: Record<FocusCategory, string> = {
  lexico: "Léxico",
  verbal: "Verbal",
  estrutural: "Estrutural",
};

const CATEGORY_ORDER: FocusCategory[] = ["lexico", "verbal", "estrutural"];

export function getFocusEnumPromptText(): string {
  return CATEGORY_ORDER.map((category) => {
    const items = FOCUS_ENUM.filter((item) => item.category === category);
    const lines = items.map(
      (item) => `- ${item.key}: ${item.labelPt} (${item.aliases.join(", ")})`,
    );
    return `${CATEGORY_LABEL[category]}:\n${lines.join("\n")}`;
  }).join("\n\n");
}

export function isValidFocusKey(key: string): boolean {
  return FOCUS_ENUM.some((item) => item.key === key);
}

export function findFocusLabel(key: string): string | undefined {
  return FOCUS_ENUM.find((item) => item.key === key)?.labelPt;
}
