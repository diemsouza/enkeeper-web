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
  }: RegisterLlmUsageInput) {
    // TODO: fix
    // if (noteId) {
    //   await prisma.llmUsage.upsert({
    //     where: {
    //       noteId: noteId,
    //     },
    //     update: {
    //       inputTokens: { increment: inputTokens },
    //       outputTokens: { increment: outputTokens },
    //       cachedTokens: { increment: cachedTokens },
    //       totalTokens: { increment: inputTokens + outputTokens },
    //       provider,
    //       model,
    //     },
    //     create: {
    //       userId,
    //       noteId,
    //       usageType,
    //       provider,
    //       model,
    //       inputTokens,
    //       outputTokens,
    //       cachedTokens,
    //       totalTokens: inputTokens + outputTokens,
    //     },
    //   });
    // } else {
    //   await prisma.llmUsage.create({
    //     data: {
    //       userId,
    //       noteId: null,
    //       usageType,
    //       provider,
    //       model,
    //       inputTokens,
    //       outputTokens,
    //       cachedTokens,
    //       totalTokens: inputTokens + outputTokens,
    //     },
    //   });
    // }
  }
}

export const llmUsageService = new LlmUsageService();
