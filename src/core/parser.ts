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

export type NumericSelectionError = "out_of_range" | "too_many" | "mixed_format";

export type NumericSelectionResult =
  | { type: "numeric"; indices: number[]; texts: string[] }
  | { type: "freeText" }
  | { type: "error"; reason: NumericSelectionError };

const SELECTION_SEPARATOR = /(?:\s+e\s+)|(?:\s*[,/-]\s*)/g;

export function parseNumericSelection(
  input: string,
  optionLabels: string[],
  maxSelections: number,
): NumericSelectionResult {
  const tokens = input
    .trim()
    .split(SELECTION_SEPARATOR)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return { type: "freeText" };

  const numericTokens = tokens.filter((token) => /^\d+$/.test(token));
  if (numericTokens.length === 0) return { type: "freeText" };
  if (numericTokens.length !== tokens.length) {
    return { type: "error", reason: "mixed_format" };
  }

  const numbers = numericTokens.map((token) => parseInt(token, 10));
  if (numbers.some((num) => num < 1 || num > optionLabels.length)) {
    return { type: "error", reason: "out_of_range" };
  }
  if (numbers.length > maxSelections) {
    return { type: "error", reason: "too_many" };
  }

  const indices = numbers.map((num) => num - 1);
  return {
    type: "numeric",
    indices,
    texts: indices.map((index) => optionLabels[index]),
  };
}

export type DomainInputResult =
  | { type: "known"; id: DomainId }
  | { type: "cancel" }
  | { type: "invalid" }
  | { type: "error"; reason: NumericSelectionError };

export function parseDomainInput(text: string): DomainInputResult {
  const n = normalize(text.trim());
  if (resolveCommand(text) === "cancel") return { type: "cancel" };
  if (n === normalize("Primeira opção")) {
    return { type: "known", id: DOMAINS[0].id };
  }
  if (n === normalize("Escolha para mim")) {
    return {
      type: "known",
      id: DOMAINS[Math.floor(Math.random() * DOMAINS.length)].id,
    };
  }

  const selection = parseNumericSelection(
    text,
    DOMAINS.map((domain) => domain.label),
    1,
  );
  if (selection.type === "error") return selection;
  if (selection.type === "numeric") {
    return { type: "known", id: DOMAINS[selection.indices[0]].id };
  }

  const match = DOMAINS.find(
    (domain) =>
      normalize(domain.label) === n ||
      normalize(domain.label).includes(n) ||
      n.includes(normalize(domain.label)),
  );
  return match ? { type: "known", id: match.id } : { type: "invalid" };
}

export type TopicInputResult =
  | { type: "known"; topic: string }
  | { type: "freeText"; text: string }
  | { type: "cancel" }
  | { type: "invalid" }
  | { type: "error"; reason: NumericSelectionError };

export function parseTopicSelectionInput(
  text: string,
  suggestions: string[],
): TopicInputResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { type: "invalid" };
  const n = normalize(trimmed);
  if (resolveCommand(text) === "cancel") return { type: "cancel" };

  if (n === normalize("Primeira opção")) {
    return { type: "known", topic: suggestions[0] };
  }
  if (n === normalize("Escolha para mim")) {
    return {
      type: "known",
      topic: suggestions[Math.floor(Math.random() * suggestions.length)],
    };
  }

  const selection = parseNumericSelection(text, suggestions, 1);
  if (selection.type === "error") return selection;
  if (selection.type === "numeric") {
    return { type: "known", topic: suggestions[selection.indices[0]] };
  }

  return { type: "freeText", text: trimmed };
}

export type FocusSelectionInput =
  | { type: "known"; keys: [string] }
  | { type: "freeText"; text: string };

export type FocusInputResult =
  | FocusSelectionInput
  | { type: "cancel" }
  | { type: "invalid" }
  | { type: "error"; reason: NumericSelectionError };

export function parseFocusSelectionInput(
  text: string,
  suggestions: { key: string; label: string }[],
): FocusInputResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { type: "invalid" };
  const n = normalize(trimmed);
  if (resolveCommand(text) === "cancel") return { type: "cancel" };

  if (n === normalize("Primeira opção")) {
    return { type: "known", keys: [suggestions[0].key] };
  }
  if (n === normalize("Escolha para mim")) {
    const picked = suggestions[Math.floor(Math.random() * suggestions.length)];
    return { type: "known", keys: [picked.key] };
  }

  const selection = parseNumericSelection(
    text,
    suggestions.map((suggestion) => suggestion.label),
    2,
  );
  if (selection.type === "error") return selection;
  if (selection.type === "numeric") {
    if (selection.indices.length === 1) {
      return { type: "known", keys: [suggestions[selection.indices[0]].key] };
    }
    return { type: "freeText", text: selection.texts.join(" e ") };
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
