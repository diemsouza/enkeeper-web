import { generateText, NoObjectGeneratedError, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractText } from "unpdf";
import {
  docProcessingSchema,
  DocProcessingResult,
  visionSchema,
  VisionResult,
  sectionQuestionSchema,
  SectionQuestionResult,
  answerEvaluationSchema,
  AnswerEvaluationResult,
} from "../lib/llm-schemas";
import { parseJsonWithFallback } from "../lib/json-utils";
import { llmUsageService } from "../services/llm-usage-service";
import {
  VOICE_PROMPT,
  DOC_EXTRACTION_PROMPT,
  ANSWER_EVALUATION_PROMPT,
  GEN_VOCABULARY_PROMPT,
  GEN_TEXT_PROMPT,
  GEN_EXERCISE_PROMPT,
} from "../lib/prompts";

const MODEL = "gpt-4.1-mini";

// ─── Doc extraction ───────────────────────────────────────────────────────────

export async function generateDocTopics(params: {
  rawContent: string;
  docType: string;
  userId: string;
  docId: string;
}): Promise<DocProcessingResult | null> {
  const { rawContent, userId, docId } = params;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let result: DocProcessingResult | null = null;

  try {
    const llmResult = await generateText({
      model: openai(MODEL),
      output: Output.object({ schema: docProcessingSchema }),
      temperature: 0.2,
      prompt: DOC_EXTRACTION_PROMPT.replace("{raw_content}", rawContent),
    });
    inputTokens += llmResult.usage?.inputTokens ?? 0;
    outputTokens += llmResult.usage?.outputTokens ?? 0;
    cachedTokens += llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0;
    result = llmResult.output;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err) && err.text) {
      try {
        result = docProcessingSchema.parse(
          parseJsonWithFallback(err.text.trim()),
        );
      } catch {
        // structured parse failed after NoObjectGeneratedError
      }
    }
  }

  await llmUsageService.registerUsage({
    userId,
    docId,
    usageType: "topic_extraction",
    provider: "openai",
    model: MODEL,
    inputTokens,
    outputTokens,
    cachedTokens,
  });

  return result;
}

// ─── Section question generation ─────────────────────────────────────────────

const SECTION_PROMPTS: Record<string, string> = {
  vocabulary: GEN_VOCABULARY_PROMPT,
  text: GEN_TEXT_PROMPT,
  exercise: GEN_EXERCISE_PROMPT,
};

export async function generateSectionQuestions(params: {
  sectionType: "vocabulary" | "text" | "exercise";
  sectionTitle: string;
  sectionContent: string;
  level: string;
  userId: string;
  docId: string;
  sectionId: string;
}): Promise<SectionQuestionResult | null> {
  const { sectionType, sectionTitle, sectionContent, level, userId, docId, sectionId } = params;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let result: SectionQuestionResult | null = null;

  const prompt = SECTION_PROMPTS[sectionType]
    .replace("{voice}", VOICE_PROMPT)
    .replace("{section_title}", sectionTitle)
    .replace("{section_content}", sectionContent)
    .replace("{level}", level || "não identificado");

  try {
    const llmResult = await generateText({
      model: openai(MODEL),
      temperature: 0.2,
      prompt,
    });
    inputTokens += llmResult.usage?.inputTokens ?? 0;
    outputTokens += llmResult.usage?.outputTokens ?? 0;
    cachedTokens += llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0;
    result = sectionQuestionSchema.parse(
      parseJsonWithFallback(llmResult.text.trim()),
    );
  } catch {
    // parse failed
  }

  await llmUsageService.registerUsage({
    userId,
    docId,
    sectionId,
    usageType: "question_extraction",
    provider: "openai",
    model: MODEL,
    inputTokens,
    outputTokens,
    cachedTokens,
  });

  return result;
}

// ─── Answer evaluation ────────────────────────────────────────────────────────

export async function generateAnswerEvaluation(params: {
  question: string;
  answerKeys: string[];
  userAnswer: string;
  attemptCount: number;
  docContent: string;
  userId: string;
  docId: string;
}): Promise<AnswerEvaluationResult | null> {
  const {
    question,
    answerKeys,
    userAnswer,
    attemptCount,
    docContent,
    userId,
    docId,
  } = params;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let result: AnswerEvaluationResult | null = null;

  const systemPrompt = ANSWER_EVALUATION_PROMPT.replace("{voice}", VOICE_PROMPT)
    .replace("{question}", question)
    .replace("{answer_keys}", answerKeys.join(", "))
    .replace("{user_answer}", userAnswer)
    .replace("{attempt_count}", String(attemptCount));

  const prompt = `Contexto do material:\n${docContent.slice(0, 1000)}`;

  try {
    const llmResult = await generateText({
      model: openai(MODEL),
      system: systemPrompt,
      output: Output.object({ schema: answerEvaluationSchema }),
      temperature: 0.3,
      prompt,
    });
    inputTokens += llmResult.usage?.inputTokens ?? 0;
    outputTokens += llmResult.usage?.outputTokens ?? 0;
    cachedTokens += llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0;
    result = llmResult.output;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err) && err.text) {
      try {
        result = answerEvaluationSchema.parse(
          parseJsonWithFallback(err.text.trim()),
        );
      } catch {
        // structured parse failed after NoObjectGeneratedError
      }
    }
  }

  await llmUsageService.registerUsage({
    userId,
    docId,
    usageType: "answer_evaluation",
    provider: "openai",
    model: MODEL,
    inputTokens,
    outputTokens,
    cachedTokens,
  });

  return result;
}

// ─── PDF extraction ───────────────────────────────────────────────────────────

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer));
  return Array.isArray(text) ? text.join("\n") : text;
}

// ─── Image transcription ──────────────────────────────────────────────────────

export async function extractTextFromImage(
  buffer: Buffer,
  userId: string,
): Promise<VisionResult> {
  const llmResult = await generateText({
    model: openai("gpt-4o-mini"),
    output: Output.object({ schema: visionSchema }),
    messages: [
      {
        role: "user",
        content: [
          { type: "image", image: buffer },
          {
            type: "text",
            text: 'Se a imagem contiver texto legível, extraia o texto exatamente como está. Caso contrário, descreva de forma concisa o que a imagem mostra. Defina transcription_type como "text" se havia texto legível ou "description" se foi gerada uma descrição.',
          },
        ],
      },
    ],
  });

  await llmUsageService.registerUsage({
    userId,
    docId: null,
    usageType: "ocr",
    provider: "openai",
    model: "gpt-4o-mini",
    inputTokens: llmResult.usage?.inputTokens ?? 0,
    outputTokens: llmResult.usage?.outputTokens ?? 0,
    cachedTokens: llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
  });

  return llmResult.output as VisionResult;
}
