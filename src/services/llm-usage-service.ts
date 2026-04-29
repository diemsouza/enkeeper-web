import { AiProvider } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { LlmUsageType } from "../types/llm-usage-type";

type RegisterLlmUsageInput = {
  userId: string;
  docId?: string | null;
  usageType: LlmUsageType;
  provider: AiProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
};

class LlmUsageService {
  async registerUsage({
    userId,
    docId,
    usageType,
    provider,
    model,
    inputTokens,
    outputTokens,
    cachedTokens,
  }: RegisterLlmUsageInput): Promise<void> {
    await prisma.llmUsage.create({
      data: {
        userId,
        docId: docId ?? null,
        usageType,
        provider,
        model,
        inputTokens,
        outputTokens,
        cachedTokens,
        totalTokens: inputTokens + outputTokens,
      },
    });
  }
}

export const llmUsageService = new LlmUsageService();
