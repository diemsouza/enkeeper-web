import { AiProvider } from "@prisma/client";
import { prisma } from "../lib/prisma";

type RegisterLlmLogInput = {
  stage: string;
  provider: AiProvider;
  model: string;
  input: Record<string, string | undefined>;
  output: string | null;
  parsedOutput: unknown;
  success: boolean;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  durationMs: number;
  userId?: string | null;
  docId?: string | null;
  sectionId?: string | null;
  questionId?: string | null;
};

class LlmLogService {
  async registerLog(params: RegisterLlmLogInput): Promise<void> {
    if (
      process.env.DISABLE_LLM_LOGS === "true" ||
      process.env.DISABLE_LLM_LOGS === "1"
    )
      return;
    try {
      await prisma.llmLog.create({
        data: {
          stage: params.stage,
          provider: params.provider,
          model: params.model,
          input: params.input,
          output: params.output !== null ? { text: params.output } : undefined,
          parsedOutput:
            params.parsedOutput !== null
              ? (params.parsedOutput as object)
              : undefined,
          success: params.success,
          error: params.error,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          cachedTokens: params.cachedTokens,
          totalTokens: params.inputTokens + params.outputTokens,
          durationMs: params.durationMs,
          userId: params.userId ?? null,
          docId: params.docId ?? null,
          sectionId: params.sectionId ?? null,
          questionId: params.questionId ?? null,
        },
      });
    } catch {
      // falha no log nunca afeta o fluxo principal
    }
  }
}

export const llmLogService = new LlmLogService();
