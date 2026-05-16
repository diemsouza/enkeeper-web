import { generateText, NoObjectGeneratedError, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
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
import { llmLogService } from "../services/llm-log-service";
import {
  VOICE_PROMPT,
  DOC_EXTRACTION_PROMPT,
  ANSWER_EVALUATION_PROMPT,
  GEN_VOCABULARY_PROMPT,
  GEN_TEXT_PROMPT,
  GEN_EXERCISE_PROMPT,
} from "../lib/prompts";
import { QuestionFormat } from "@prisma/client";

const MODEL_MINI = "gpt-4.1-mini";
const MODEL_ANTHROPIC = "claude-haiku-4-5-20251001";
const MODEL_OPENAI = "gpt-4.1";
const PROVIDER_STANDARD = "anthropic";
// ─── Doc extraction ───────────────────────────────────────────────────────────

const getStandardModel = () => {
  if (PROVIDER_STANDARD === "anthropic") return MODEL_ANTHROPIC;
  return MODEL_OPENAI;
};

const getStandardLanguageModel = () => {
  if (PROVIDER_STANDARD === "anthropic") return anthropic(getStandardModel());
  return openai(getStandardModel());
};

export async function generateDocSections(params: {
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
  let rawOutput: string | null = null;
  let logError: string | null = null;
  const startTime = Date.now();

  const systemPrompt = DOC_EXTRACTION_PROMPT;
  const userPrompt = `Conteúdo recebido:
{raw_content}`.replace("{raw_content}", rawContent);

  try {
    const llmResult = await generateText({
      model: openai(MODEL_MINI),
      output: Output.object({ schema: docProcessingSchema }),
      temperature: 0.2,
      system: systemPrompt,
      prompt: userPrompt,
    });
    inputTokens += llmResult.usage?.inputTokens ?? 0;
    outputTokens += llmResult.usage?.outputTokens ?? 0;
    cachedTokens += llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0;
    rawOutput = llmResult.text ?? null;
    result = llmResult.output;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err) && err.text) {
      rawOutput = err.text;
      try {
        result = docProcessingSchema.parse(
          parseJsonWithFallback(err.text.trim()),
        );
      } catch {
        // structured parse failed after NoObjectGeneratedError
      }
    } else if (err instanceof Error) {
      logError = err.message;
    }
  }

  const durationMs = Date.now() - startTime;

  await llmUsageService.registerUsage({
    userId,
    docId,
    usageType: "topic_extraction",
    provider: "openai",
    model: MODEL_MINI,
    inputTokens,
    outputTokens,
    cachedTokens,
  });

  await llmLogService.registerLog({
    stage: "doc-extraction",
    provider: "openai",
    model: MODEL_MINI,
    input: { system: systemPrompt, prompt: userPrompt },
    output: rawOutput,
    parsedOutput: result,
    success: result !== null,
    error: logError,
    inputTokens,
    outputTokens,
    cachedTokens,
    durationMs,
    userId,
    docId,
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
  questionExamples: string;
  userId: string;
  docId: string;
  sectionId: string;
}): Promise<SectionQuestionResult | null> {
  const {
    sectionType,
    sectionTitle,
    sectionContent,
    level,
    questionExamples,
    userId,
    docId,
    sectionId,
  } = params;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let result: SectionQuestionResult | null = null;
  let rawOutput: string | null = null;
  let logError: string | null = null;
  const startTime = Date.now();

  const systemPrompt = SECTION_PROMPTS[sectionType]
    .replace("{voice}", VOICE_PROMPT)
    .replace("{question_examples}", questionExamples);

  const userPrompt = `Seção: {section_title}
Conteúdo: {section_content}
Nível: {level}`
    .replace("{section_title}", sectionTitle)
    .replace("{section_content}", sectionContent)
    .replace("{level}", level);

  try {
    const llmResult = await generateText({
      model: getStandardLanguageModel(),
      system: systemPrompt,
      temperature: 0.2,
      prompt: userPrompt,
    });
    inputTokens += llmResult.usage?.inputTokens ?? 0;
    outputTokens += llmResult.usage?.outputTokens ?? 0;
    cachedTokens += llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0;
    rawOutput = llmResult.text ?? null;
    result = sectionQuestionSchema.parse(
      parseJsonWithFallback(llmResult.text.trim()),
    );

    // Validação anti-vazamento entre itens adjacentes (só vocabulary).
    // sourceItem é o "ponteiro" declarado pelo modelo pro item da lista
    // que ele está cobrindo. Pra ser válido:
    // - recall_inverted: sourceItem deve aparecer na pergunta (ex: "O que significa 'blanket'?")
    // - demais formatos: sourceItem deve estar no answerKeys
    // Se não bater, descarta. sourceItem removido antes de salvar (auditoria).
    if (result && sectionType === "vocabulary") {
      const valid = result
        .filter((q) => {
          const source = q.sourceItem?.toLowerCase().trim();
          if (!source) return false;

          if (q.questionFormat === "recall_inverted") {
            // sourceItem aparece NA pergunta (entre aspas)
            return q.question.toLowerCase().includes(source);
          }

          // demais formatos: sourceItem está no answerKeys
          const keys = q.answerKeys.map((k) => k.toLowerCase().trim());
          return keys.includes(source);
        })
        .map(({ sourceItem, ...rest }) => rest);

      const discarded = result.length - valid.length;
      if (discarded > 0) {
        console.warn(
          `[gen-vocabulary] ${discarded}/${result.length} perguntas descartadas por sourceItem inconsistente`,
        );
      }

      result = valid as SectionQuestionResult;
    }
  } catch (err) {
    if (err instanceof Error) logError = err.message;
  }

  const durationMs = Date.now() - startTime;

  await llmUsageService.registerUsage({
    userId,
    docId,
    sectionId,
    usageType: "question_extraction",
    provider: PROVIDER_STANDARD,
    model: getStandardModel(),
    inputTokens,
    outputTokens,
    cachedTokens,
  });

  await llmLogService.registerLog({
    stage: `gen-${sectionType}`,
    provider: PROVIDER_STANDARD,
    model: getStandardModel(),
    input: { system: systemPrompt, prompt: userPrompt },
    output: rawOutput,
    parsedOutput: result,
    success: result !== null,
    error: logError,
    inputTokens,
    outputTokens,
    cachedTokens,
    durationMs,
    userId,
    docId,
    sectionId,
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
  feedbackExamples: string;
  questionFormat: string;
  level: string;
  userId: string;
  docId: string;
  questionFormats: QuestionFormat[];
}): Promise<AnswerEvaluationResult | null> {
  const {
    question,
    answerKeys,
    userAnswer,
    attemptCount,
    docContent,
    feedbackExamples,
    questionFormat,
    level,
    userId,
    docId,
  } = params;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let result: AnswerEvaluationResult | null = null;
  let rawOutput: string | null = null;
  let logError: string | null = null;
  const startTime = Date.now();

  const systemPrompt = ANSWER_EVALUATION_PROMPT.replace(
    "{voice}",
    VOICE_PROMPT,
  ).replace("{feedback_examples}", feedbackExamples);

  let userPrompt = `Pergunta: {question}
Formato: {question_format}
Respostas válidas: {answer_keys}
Tentativas: {attempt_count}
Nível: {level}
Resposta do usuário: {user_answer}`
    .replace("{question}", question)
    .replace("{answer_keys}", answerKeys.join(", "))
    .replace("{user_answer}", userAnswer)
    .replace("{attempt_count}", String(attemptCount))
    .replace("{level}", level)
    .replace("{question_format}", questionFormat);

  userPrompt += questionFormat.includes("open_text")
    ? `Contexto do material:\n${docContent.slice(0, 1000)}`
    : "";

  try {
    const llmResult = await generateText({
      model: getStandardLanguageModel(),
      system: systemPrompt,
      output: Output.object({ schema: answerEvaluationSchema }),
      temperature: 0.3,
      prompt: userPrompt,
    });
    inputTokens += llmResult.usage?.inputTokens ?? 0;
    outputTokens += llmResult.usage?.outputTokens ?? 0;
    cachedTokens += llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0;
    rawOutput = llmResult.text ?? null;
    result = llmResult.output;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err) && err.text) {
      rawOutput = err.text;
      try {
        result = answerEvaluationSchema.parse(
          parseJsonWithFallback(err.text.trim()),
        );
      } catch {
        // structured parse failed after NoObjectGeneratedError
      }
    } else if (err instanceof Error) {
      logError = err.message;
    }
  }

  const durationMs = Date.now() - startTime;

  await llmUsageService.registerUsage({
    userId,
    docId,
    usageType: "answer_evaluation",
    provider: PROVIDER_STANDARD,
    model: getStandardModel(),
    inputTokens,
    outputTokens,
    cachedTokens,
  });

  await llmLogService.registerLog({
    stage: "answer-evaluation",
    provider: PROVIDER_STANDARD,
    model: getStandardModel(),
    input: { system: systemPrompt, prompt: userPrompt },
    output: rawOutput,
    parsedOutput: result,
    success: result !== null,
    error: logError,
    inputTokens,
    outputTokens,
    cachedTokens,
    durationMs,
    userId,
    docId,
  });

  return result;
}

// ─── PDF extraction ───────────────────────────────────────────────────────────

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer));
  return Array.isArray(text) ? text.join("\n") : text;
}

// ─── Image transcription ──────────────────────────────────────────────────────

const OCR_PROMPT =
  'Se a imagem contiver texto legível, extraia o texto exatamente como está. Caso contrário, descreva de forma concisa o que a imagem mostra. Defina transcription_type como "text" se havia texto legível ou "description" se foi gerada uma descrição.';

export async function extractTextFromImage(
  buffer: Buffer,
  userId: string,
): Promise<VisionResult> {
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let result: VisionResult | null = null;
  let rawOutput: string | null = null;
  let logError: string | null = null;
  const startTime = Date.now();

  try {
    const llmResult = await generateText({
      model: openai("gpt-4o-mini"),
      output: Output.object({ schema: visionSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: buffer },
            { type: "text", text: OCR_PROMPT },
          ],
        },
      ],
    });
    inputTokens = llmResult.usage?.inputTokens ?? 0;
    outputTokens = llmResult.usage?.outputTokens ?? 0;
    cachedTokens = llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0;
    rawOutput = llmResult.text ?? null;
    result = llmResult.output as VisionResult;
  } catch (err) {
    if (err instanceof Error) logError = err.message;
  }

  const durationMs = Date.now() - startTime;

  await llmUsageService.registerUsage({
    userId,
    docId: null,
    usageType: "ocr",
    provider: "openai",
    model: "gpt-4o-mini",
    inputTokens,
    outputTokens,
    cachedTokens,
  });

  await llmLogService.registerLog({
    stage: "ocr",
    provider: "openai",
    model: "gpt-4o-mini",
    input: { prompt: OCR_PROMPT },
    output: rawOutput,
    parsedOutput: result,
    success: result !== null,
    error: logError,
    inputTokens,
    outputTokens,
    cachedTokens,
    durationMs,
    userId,
  });

  if (!result) throw new Error("OCR failed");
  return result;
}
