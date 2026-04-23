import { JSONType } from "./json-type";

export function parseJsonWithFallback<T = any>(raw: string): T {
  // 1) tentativa direta
  const clean = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch (err) {
    // segue para o fallback
    console.warn("[JSON_PARSE_FALLBACK]", {
      message: (err as Error).message,
      preview: raw.slice(0, 300), // evita log gigante
    });
  }

  // 2) fallback: extrair o primeiro JSON válido
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
      return JSON.parse(jsonSlice);
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
