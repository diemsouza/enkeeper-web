import { JSONType } from "./json-type";

function assertObjectRoot(value: unknown): void {
  if (Array.isArray(value) || typeof value !== "object" || value === null) {
    throw new Error("Expected object root, got array or primitive");
  }
}

export function parseJsonWithFallback<T = any>(raw: string): T {
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(clean);
    assertObjectRoot(parsed);
    return parsed;
  } catch (err) {
    console.warn("[parseJsonWithFallback]", {
      message: (err as Error).message,
      preview: raw.slice(0, 300),
    });
  }

  const s = raw.trim();
  const start = s.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in response");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") depth--;

    if (depth === 0) {
      const jsonSlice = s.slice(start, i + 1);
      const parsed = JSON.parse(jsonSlice);
      assertObjectRoot(parsed);
      return parsed;
    }
  }

  throw new Error("Unclosed JSON object in response");
}

export const parseRawMessage = (
  rawMessage: string,
  fallbackError?: string,
): JSONType => {
  try {
    const data = parseJsonWithFallback(rawMessage.trim());
    return data;
  } catch (err) {
    console.error("Erro ao parsear JSON:", err, rawMessage);
    return {
      message: fallbackError,
    };
  }
};
