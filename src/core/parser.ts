import { ParsedMessage } from "../types/domain";
import { Level } from "../lib/prisma";
import { DOMAINS, DomainId } from "../lib/constants";
import { resolveCommand } from "../lib/commands";

function normalize(s: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function parseLevelInput(text: string): Level | "cancel" | null {
  const n = normalize(text.trim()).replace(/[).\s]+$/g, "");
  if (n === "a" || n === "basico") return Level.basic;
  if (n === "b" || n === "intermediario") return Level.intermediate;
  if (n === "c" || n === "avancado") return Level.advanced;
  if (resolveCommand(text) === "cancel") return "cancel";
  return null;
}

function parseFixedChoiceInput<T extends { id: string; label: string }>(
  text: string,
  options: readonly T[],
): T["id"] | "cancel" | null {
  const n = normalize(text.trim());
  if (resolveCommand(text) === "cancel") return "cancel";
  const num = parseInt(n, 10);
  if (!isNaN(num) && num >= 1 && num <= options.length) {
    return options[num - 1].id;
  }
  const match = options.find(
    (o) =>
      normalize(o.label) === n ||
      normalize(o.label).includes(n) ||
      n.includes(normalize(o.label)),
  );
  return match?.id ?? null;
}

export function parseDomainInput(text: string): DomainId | "cancel" | null {
  return parseFixedChoiceInput(text, DOMAINS);
}

export function parseTopicSelectionInput(
  text: string,
  suggestions: string[],
): string | "cancel" | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const n = normalize(trimmed);
  if (resolveCommand(text) === "cancel") return "cancel";

  if (/^\d+$/.test(n)) {
    const num = parseInt(n, 10);
    if (num >= 1 && num <= suggestions.length) {
      return suggestions[num - 1];
    }
  }

  return trimmed;
}

export type FocusSelectionInput =
  | { type: "known"; keys: [string] }
  | { type: "freeText"; text: string };

export function parseFocusSelectionInput(
  text: string,
  suggestions: { key: string; label: string }[],
): FocusSelectionInput | "cancel" | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const n = normalize(trimmed);
  if (resolveCommand(text) === "cancel") return "cancel";

  if (/^\d+$/.test(n)) {
    const num = parseInt(n, 10);
    if (num >= 1 && num <= suggestions.length) {
      return { type: "known", keys: [suggestions[num - 1].key] };
    }
  }

  return { type: "freeText", text: trimmed };
}

export function parseMessage(
  text: string,
  context: { isIntensiveMode?: boolean } = {},
): ParsedMessage {
  const raw = text;
  const trimmed = text.trim();
  const commandId = resolveCommand(trimmed);

  switch (commandId) {
    case "help":
      return { intent: "list_commands", raw };
    case "list_activities":
      return { intent: "list_activities", raw };
    case "set_level":
      return { intent: "set_level", raw };
    case "support":
      return { intent: "support", raw };
    case "new_activity":
      return { intent: "new_activity", raw };
    case "confirm_yes":
      return { intent: "confirm", raw };
    case "confirm_no":
      return { intent: "cancel_no", raw };
    case "cancel":
      return { intent: "cancel", raw };
    case "practice_now":
      return { intent: "practice_now", raw };
    case "pause":
      return {
        intent: context.isIntensiveMode ? "pause_practice" : "pause_activity",
        raw,
      };
    case "resume":
      return { intent: "resume_activity", raw };
  }

  const [firstWord, ...rest] = trimmed.split(/\s+/);
  const firstWordCommand = resolveCommand(firstWord);

  if (firstWordCommand === "pause") {
    const num = parseInt(rest.join(" "), 10);
    return {
      intent: "pause_activity",
      raw,
      docIndex: isNaN(num) ? undefined : num,
    };
  }

  if (firstWordCommand === "resume") {
    const num = parseInt(rest.join(" "), 10);
    return {
      intent: "resume_activity",
      raw,
      docIndex: isNaN(num) ? undefined : num,
    };
  }

  return { intent: "free_text", raw, content: trimmed };
}
