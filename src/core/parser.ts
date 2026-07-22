import { ParsedMessage } from "../types/domain";
import { Level } from "../lib/prisma";
import {
  CONTENT_GROUPS,
  CONTENT_SUBGROUPS,
  ContentGroupId,
  ContentSubgroupId,
} from "../lib/constants";

function normalize(s: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function parseLevelInput(text: string): Level | "cancel" | null {
  const n = normalize(text.trim());
  if (n === "a" || n === "basico") return Level.basic;
  if (n === "b" || n === "intermediario") return Level.intermediate;
  if (n === "c" || n === "avancado") return Level.advanced;
  if (n === "cancelar") return "cancel";
  return null;
}

function parseFixedChoiceInput<T extends { id: string; label: string }>(
  text: string,
  options: readonly T[],
): T["id"] | "cancel" | null {
  const n = normalize(text.trim());
  if (n === "cancelar") return "cancel";
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

export function parseContentGroupInput(
  text: string,
): ContentGroupId | "cancel" | null {
  return parseFixedChoiceInput(text, CONTENT_GROUPS);
}

export function parseContentSubgroupInput(
  text: string,
): ContentSubgroupId | "cancel" | null {
  return parseFixedChoiceInput(text, CONTENT_SUBGROUPS);
}

export function parseMessage(
  text: string,
  context: { isIntensiveMode?: boolean } = {},
): ParsedMessage {
  const raw = text;
  const trimmed = text.trim();
  const n = normalize(trimmed);

  if (n === "ajuda") return { intent: "list_commands", raw };
  if (n === "atividade" || n === "atividades")
    return { intent: "list_activities", raw };
  if (n === "nivel") return { intent: "set_level", raw };
  if (n === "suporte") return { intent: "support", raw };
  if (n === "nova atividade" || n === "trocar atividade")
    return { intent: "new_activity", raw };

  if (n === "sim") return { intent: "confirm", raw };
  if (n === "nao") return { intent: "cancel_no", raw };
  if (n === "cancelar") return { intent: "cancel", raw };

  if (n === "praticar") return { intent: "practice_now", raw };

  if (n === "pausar") {
    return {
      intent: context.isIntensiveMode ? "pause_practice" : "pause_activity",
      raw,
    };
  }

  if (n.startsWith("pausar ")) {
    const num = parseInt(n.slice("pausar ".length).trim(), 10);
    return {
      intent: "pause_activity",
      raw,
      docIndex: isNaN(num) ? undefined : num,
    };
  }

  if (n === "retomar") return { intent: "resume_activity", raw };
  if (n.startsWith("retomar ")) {
    const num = parseInt(n.slice("retomar ".length).trim(), 10);
    return {
      intent: "resume_activity",
      raw,
      docIndex: isNaN(num) ? undefined : num,
    };
  }

  return { intent: "free_text", raw, content: trimmed };
}
