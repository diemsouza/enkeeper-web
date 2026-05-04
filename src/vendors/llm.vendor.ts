import { generateText, NoObjectGeneratedError, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractText } from "unpdf";
import { Doc } from "@prisma/client";
import {
  docProcessingSchema,
  DocProcessingResult,
  visionSchema,
  VisionResult,
  questionExtractionSchema,
  QuestionExtractionResult,
  answerEvaluationSchema,
  AnswerEvaluationResult,
} from "../lib/llm-schemas";
import { parseJsonWithFallback } from "../lib/json-utils";
import { llmUsageService } from "../services/llm-usage-service";
import { Approach } from "../core/approach";
import {
  BASE_PROMPT,
  FEEDBACK_PROMPT,
  APPROACH_PROMPTS,
  QUESTION_EXTRACTION_PROMPT,
  ANSWER_EVALUATION_PROMPT,
} from "../lib/prompts";

const MODEL = "gpt-4.1-mini";

// ─── Doc extraction ───────────────────────────────────────────────────────────

const buildDocPrompt = (
  rawContent: string,
) => `Você recebeu um conteúdo de estudo. Extraia:
- title: título curto (máx 8 palavras) que resuma o tema
- topics: lista de 8 a 12 tópicos principais para praticar (strings curtas)
- content: reescreva o conteúdo de forma clara e objetiva, mantendo todas as informações importantes para estudo espaçado
- approach: classifique o objetivo pedagógico do material:
  - "memorize" - lista de vocabulário, versículos, fórmulas, leis, citações para fixar
  - "understand" - conteúdo técnico explicativo, regras, sistemas, teorias, processos
  - "practice" - idioma estrangeiro para fluência, vocabulário técnico em uso real, exercícios para resolver
  - "discuss" - capítulo de livro, ensaio, artigo, palestra, não-ficção densa
  - "reflect" - devocional, autoajuda, espiritualidade, leitura introspectiva
  Se ambíguo, use "understand".
- approachConfidence: "high" se o sinal é claro; "medium" se material é misto; "low" se muito ambíguo
- isValid: true se o conteúdo tem substância suficiente para gerar prática; false se é muito curto, vago ou sem sentido pedagógico
- invalidReason: null se válido; caso contrário, breve explicação em português (ex: "conteúdo muito curto", "sem estrutura de estudo")

Conteúdo:
${rawContent}`;

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
      prompt: buildDocPrompt(rawContent),
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

// ─── Practice message generation ─────────────────────────────────────────────

const APPROACH = APPROACH_PROMPTS as Record<Approach, string>;

function buildContext(input: {
  doc: Pick<Doc, "docType" | "content" | "topicsData">;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  currentTopic: string;
  now: string;
}): string {
  const topics = input.doc.topicsData as string[];
  const recentHistory = input.history.slice(-4);

  return `CONTEXTO

Material:
- Tipo: ${input.doc.docType}
- Tópicos: ${topics.join(", ")}
- Trecho: "${input.doc.content.slice(0, 1200)}"

Últimas trocas (mais recente primeiro):
${recentHistory.length > 0 ? recentHistory.map((h) => `- ${h.role}: ${h.content}`).join("\n") : "(nenhuma)"}

Tópico desta mensagem: ${input.currentTopic}
Hora: ${input.now}

Gere UMA mensagem praticando o tópico acima. Saída: apenas o texto, sem aspas, sem prefixo.`;
}

export function buildPracticeMessagePrompt(
  approach: Approach,
  context: Parameters<typeof buildContext>[0],
): string {
  return `${BASE_PROMPT}\n\n${APPROACH[approach]}\n\n${buildContext(context)}`;
}

export async function generatePracticeMessage(params: {
  topic: string;
  lastUserReply: string | null;
  doc: Pick<Doc, "docType" | "content" | "topicsData">;
  topicIndex: number;
  totalTopics: number;
  userId: string;
  docId: string;
  approach: Approach;
}): Promise<string> {
  const {
    topic,
    lastUserReply,
    doc,
    topicIndex,
    totalTopics,
    userId,
    docId,
    approach,
  } = params;

  const history: Array<{ role: "user" | "assistant"; content: string }> =
    lastUserReply ? [{ role: "user", content: lastUserReply }] : [];

  const systemPrompt = buildPracticeMessagePrompt(approach, {
    doc,
    history,
    currentTopic: `${topicIndex + 1}/${totalTopics} - ${topic}`,
    now: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });

  const llmResult = await generateText({
    model: openai(MODEL),
    prompt: systemPrompt,
    temperature: 0.7,
  });

  await llmUsageService.registerUsage({
    userId,
    docId,
    usageType: "practice_generation",
    provider: "openai",
    model: MODEL,
    inputTokens: llmResult.usage?.inputTokens ?? 0,
    outputTokens: llmResult.usage?.outputTokens ?? 0,
    cachedTokens: llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
  });

  return llmResult.text.trim();
}

// ─── Practice feedback ───────────────────────────────────────────────────────

export async function generatePracticeFeedback(params: {
  question: string;
  userReply: string;
  topic: string;
  docContent: string;
  userId: string;
  docId: string;
  approach: Approach;
}): Promise<string> {
  const { question, userReply, topic, docContent, userId, docId } = params;

  const prompt = [
    `Tópico: ${topic}`,
    `Pergunta feita: "${question}"`,
    `Resposta do usuário: "${userReply}"`,
    `\nContexto do material:\n${docContent.slice(0, 1000)}`,
  ].join("\n");

  const llmResult = await generateText({
    model: openai(MODEL),
    system: FEEDBACK_PROMPT,
    prompt,
    temperature: 0.5,
  });

  await llmUsageService.registerUsage({
    userId,
    docId,
    usageType: "practice_feedback",
    provider: "openai",
    model: MODEL,
    inputTokens: llmResult.usage?.inputTokens ?? 0,
    outputTokens: llmResult.usage?.outputTokens ?? 0,
    cachedTokens: llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0,
  });

  return llmResult.text.trim();
}

// ─── Question extraction ──────────────────────────────────────────────────────

export async function generateQuestions(params: {
  docContent: string;
  docType: string;
  userId: string;
  docId: string;
}): Promise<QuestionExtractionResult | null> {
  const { docContent, userId, docId } = params;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let result: QuestionExtractionResult | null = null;

  const prompt = `${QUESTION_EXTRACTION_PROMPT}\n\nMaterial:\n${docContent}`;

  try {
    const llmResult = await generateText({
      model: openai(MODEL),
      temperature: 0.2,
      prompt,
    });
    inputTokens += llmResult.usage?.inputTokens ?? 0;
    outputTokens += llmResult.usage?.outputTokens ?? 0;
    cachedTokens += llmResult.usage?.inputTokenDetails?.cacheReadTokens ?? 0;
    result = questionExtractionSchema.parse(
      parseJsonWithFallback(llmResult.text.trim()),
    );
  } catch {
    // parse failed
  }

  await llmUsageService.registerUsage({
    userId,
    docId,
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
  const { question, answerKeys, userAnswer, attemptCount, docContent, userId, docId } = params;
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let result: AnswerEvaluationResult | null = null;

  const systemPrompt = ANSWER_EVALUATION_PROMPT
    .replace("{base}", BASE_PROMPT)
    .replace("{feedback}", FEEDBACK_PROMPT)
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
