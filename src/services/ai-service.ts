import { generateText, NoObjectGeneratedError, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { AiProvider } from "@prisma/client";
import { parseJsonWithFallback } from "../lib/json-utils";
import { analysisSchema, AnalysisSchema } from "../lib/llm-schemas";
// import { llmUsageService } from "./llm-usage-service";

export class AiService {
  private primary: AiProvider;

  constructor(primaryProvider: AiProvider = "openai") {
    this.primary = primaryProvider;
  }

  async exec({ input }: { input: string }): Promise<AnalysisSchema | null> {
    const prompt = `Add prompt here`;

    try {
      const model = "gpt-4.1-mini";
      const llmResult = await generateText({
        model: openai(model),
        output: Output.object({ schema: analysisSchema }),
        temperature: 0.1,
        prompt,
      });

      const inputTokens = llmResult.usage?.inputTokens ?? 0;
      const outputTokens = llmResult.usage?.outputTokens ?? 0;
      const cachedTokens =
        llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0;

      // TODO: refactory
      // await llmUsageService.registerUsage({
      //   provider: "openai",
      //   model,
      //   inputTokens,
      //   outputTokens,
      //   cachedTokens,
      //   usageType: "analysis",
      // });

      return llmResult.output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err) && err.text) {
        try {
          const parsed = analysisSchema.parse(
            parseJsonWithFallback(err.text.trim()),
          );
          return parsed;
        } catch {
          // parse falhou mesmo assim
        }
      }
    }

    return null;
  }
}
