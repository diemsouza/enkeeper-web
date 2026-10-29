import { ParsedMessage } from "../types/domain";
import { resolveCommand } from "../lib/commands";
import type {
  FormattedMessage,
  FormattedMessageButton,
} from "../types/out-message";

function normalize(s: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export type NumericSelectionError =
  "out_of_range" | "too_many" | "mixed_format";

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

export function resolveSelectedButtonId(
  buttons: FormattedMessageButton[],
  buttonId: string | undefined,
  answerText: string,
): string | null {
  if (buttonId && buttons.some((b) => b.id === buttonId)) return buttonId;

  const labels = buttons.map((b) => b.label);
  const selection = parseNumericSelection(answerText, labels, 1);
  if (selection.type === "numeric") return buttons[selection.indices[0]].id;

  const answer = normalize(answerText.trim());
  const match = buttons.find((b) => normalize(b.label.trim()) === answer);
  return match?.id ?? null;
}

export function buildAnsweredInteractive(
  interactive: NonNullable<FormattedMessage["interactive"]>,
  selectedId: string | null,
): NonNullable<FormattedMessage["interactive"]> {
  return {
    ...interactive,
    disabled: true,
    ...(selectedId ? { selectedId } : {}),
  };
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
