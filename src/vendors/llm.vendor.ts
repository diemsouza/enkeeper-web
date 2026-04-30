import { generateText, NoObjectGeneratedError, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractText } from "unpdf";
import {
  docProcessingSchema,
  DocProcessingResult,
  visionSchema,
  VisionResult,
} from "../lib/llm-schemas";
import { parseJsonWithFallback } from "../lib/json-utils";
import { llmUsageService } from "../services/llm-usage-service";

const MODEL = "gpt-4.1-mini";

// ─── Doc extraction ───────────────────────────────────────────────────────────

const buildDocPrompt = (
  rawContent: string,
) => `Você recebeu um conteúdo de estudo. Extraia:
- title: título curto (máx 8 palavras) que resuma o tema
- topics: lista de 8 a 12 tópicos principais para praticar (strings curtas)
- content: reescreva o conteúdo de forma clara e objetiva, mantendo todas as informações importantes para estudo espaçado
- activityMode: classifique o melhor modo de prática para este material:
  - "flashcard" - lista de palavras, vocabulário, traduções
  - "qa" - questões, exercícios, provas
  - "chat" - texto corrido, aula, artigo, capítulo, resumo
  - "mixed" - material com vocabulário e texto junto
  Se não tiver certeza, use "chat".
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

const PRACTICE_PROMPTS: Record<string, string> = {
  flashcard: `Parceiro de prática via WhatsApp. Uma pergunta por mensagem, nunca lista.
Tom: direto. Máximo 2 linhas.
Formatos (varie, nunca repita consecutivo): "Como se diz X?", "Qual o oposto de Y?", "Use Z numa frase.", "Complete: ___ significa ___?", provocação direta.
Se o usuário respondeu algo, reaja em uma linha antes de ir pro próximo.`,

  qa: `Parceiro de prática via WhatsApp. Uma pergunta por mensagem, nunca lista numerada.
Tom: direto. Máximo 2 linhas.
Formatos: pergunta direta sobre o conceito, fill-in-the-blank com uma lacuna só, "por que X e não Y?", aplicação prática do conceito.
Se o usuário respondeu algo, reaja em uma linha antes de continuar.`,

  chat: `Parceiro de prática via WhatsApp. Uma pergunta por mensagem, nunca lista.
Tom: casual, curioso. Máximo 3 linhas.
Formatos (varie): pergunta aberta sobre o tema, "como você explicaria X?", conexão com situação real, role-play se for inglês.
Se material for inglês, alterne PT e EN. Se o usuário respondeu, reaja brevemente antes de avançar.
Sem resposta certa — objetivo é fazer pensar.`,

  mixed: `Parceiro de prática via WhatsApp. Uma pergunta por mensagem, nunca lista.
Tom: adaptável. Máximo 3 linhas.
Vocabulário: pergunta objetiva sobre o termo. Conceito: pergunta contextual ou aplicação.
Se o usuário respondeu algo, reaja em uma linha antes de continuar.`,
};

export async function generatePracticeMessage(params: {
  topic: string;
  lastUserReply: string | null;
  docContent: string;
  topicIndex: number;
  totalTopics: number;
  userId: string;
  docId: string;
  activityMode: string;
}): Promise<string> {
  const {
    topic,
    lastUserReply,
    docContent,
    topicIndex,
    totalTopics,
    userId,
    docId,
    activityMode,
  } = params;

  const userPrompt = [
    `Tópico atual (${topicIndex + 1}/${totalTopics}): ${topic}`,
    `Use um formato diferente dos anteriores.`,
    lastUserReply ? `Última resposta do usuário: "${lastUserReply}"` : null,
    `\nTrecho do material:\n${docContent.slice(0, 1500)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const llmResult = await generateText({
    model: openai(MODEL),
    system: PRACTICE_PROMPTS[activityMode] ?? PRACTICE_PROMPTS.chat,
    prompt: userPrompt,
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

const FEEDBACK_PROMPTS: Record<string, string> = {
  flashcard: `Você é um parceiro de prática de estudos via WhatsApp.
Tom: direto. Máximo 2 linhas.
Correto: confirma brevemente, pode adicionar variação ou exemplo. Parcialmente: reconhece o que acertou, completa o que faltou. Errado: diz o correto de forma natural.
Nunca: "você acertou", "muito bem", "parabéns", "ótimo". Nunca repita a pergunta.`,

  qa: `Você é um parceiro de prática de estudos via WhatsApp.
Tom: direto, preciso. Máximo 3 linhas.
Correto: confirma, pode reforçar o conceito ou dar contraexemplo. Parcialmente: aponta o que faltou. Errado: explica o correto.
Nunca: "você acertou", "muito bem", "parabéns", "ótimo". Nunca repita a pergunta.`,

  chat: `Você é um parceiro de prática de estudos via WhatsApp.
Tom: casual, engajado. Máximo 3 linhas.
Não avalie certo/errado - essa conversa não tem resposta certa.
Enriqueça o que o usuário disse: adicione contexto, perspectiva ou exemplo. Faça a conversa avançar.`,

  mixed: `Você é um parceiro de prática de estudos via WhatsApp.
Tom: adaptável. Máximo 3 linhas.
Se a pergunta foi sobre vocabulário/termo: avalie objetivamente sem usar "errado" ou "certo".
Se foi conceitual/discussão: enriqueça a resposta, adicione contexto, faça avançar.
Nunca: "você acertou", "muito bem", "parabéns", "ótimo".`,
};

export async function generatePracticeFeedback(params: {
  question: string;
  userReply: string;
  topic: string;
  docContent: string;
  userId: string;
  docId: string;
  activityMode: string;
}): Promise<string> {
  const {
    question,
    userReply,
    topic,
    docContent,
    userId,
    docId,
    activityMode,
  } = params;

  const prompt = [
    `Tópico: ${topic}`,
    `Pergunta feita: "${question}"`,
    `Resposta do usuário: "${userReply}"`,
    `\nContexto do material:\n${docContent.slice(0, 1000)}`,
  ].join("\n");

  const llmResult = await generateText({
    model: openai(MODEL),
    system: FEEDBACK_PROMPTS[activityMode] ?? FEEDBACK_PROMPTS.chat,
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
