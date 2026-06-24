import { AiProvider } from "../lib/prisma";
import { JSONType } from "../lib/json-type";

export type AiResponse = {
  message: string;
  jsonMessage: JSONType;
  model: string;
  provider: AiProvider;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
} | null;
