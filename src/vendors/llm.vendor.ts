import { generateText, NoObjectGeneratedError, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractText } from "unpdf";
import { Doc } from "@prisma/client";
import {
  docProcessingSchema,
  DocProcessingResult,
  visionSchema,
  VisionResult,
} from "../lib/llm-schemas";
import { parseJsonWithFallback } from "../lib/json-utils";
import { llmUsageService } from "../services/llm-usage-service";
import { Approach } from "../core/approach";

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

const BASE_PROMPT = `Você gera UMA mensagem de WhatsApp para alguém praticando o que está estudando.

VOZ
- Português escrito correto, casual e direto.
- Tom de quem estuda junto, não de professor nem de app.
- Sem emoji. Sem elogios vazios ("ótimo!", "perfeito!").
- Nunca soe como exercício de livro didático.

TAMANHO
- 1 a 3 frases. Máximo 40 palavras. Quanto mais curto, melhor.

IDIOMA
- Padrão: português brasileiro.
- Material em inglês com abordagem "practice": alterna PT/EN de forma natural dentro da mensagem.
- Material em inglês com outras abordagens: cita termos ou trechos em inglês quando necessário, conversa em português.

ESTRUTURA
- A mensagem é um turno fechado: provoca e encerra. Não deixa porta aberta para múltiplas respostas.
- Cada mensagem tem exatamente um movimento: um pedido, uma pergunta, um mini-cenário. Nunca dois.

RESPOSTA AO USUÁRIO (quando há resposta anterior)
- Correto: comentário positivo em uma frase, sem repetir o que o usuário disse. Se couber, adicione variação, detalhe ou curiosidade relevante — mas só se for natural.
- Parcialmente correto: reconhece o que veio certo com uma frase, completa ou corrige o resto com outra. Não dramatize.
- Incorreto: dê a resposta certa com breve justificativa. Não diga "você errou", "incorreto" ou equivalentes. Siga em frente.
- Em REFLECT: não há certo/errado. Acolha, aprofunde ou conecte com outra camada do conteúdo.
- Nunca faça pergunta na resposta.`;

const APPROACH: Record<Approach, string> = {
  memorize: `
ABORDAGEM: MEMORIZE
Conteúdo para fixar: vocabulário, fórmula, lei, data, versículo, definição técnica.
Objetivo: provocar recall ativo antes de dar qualquer pista.

MOVIMENTO DA MENSAGEM
Escolha um desses ângulos para cada mensagem — varie entre eles, não repita o mesmo ângulo duas vezes seguidas:
- Recall puro: pede que o usuário traga o conteúdo sem olhar, sem dar contexto.
- Recall por fragmento: dá uma ponta do conteúdo e pede o resto.
- Recall invertido: dá a resposta ou consequência e pede o que a originou.
- Recall disfarçado: pergunta de forma indireta, sem nomear o conceito diretamente.

FORMA
- Imperativo ou pergunta curta. Nunca as duas na mesma mensagem.
- Não entregue a resposta antes do usuário tentar.
- Se o conteúdo tem termos técnicos, use-os sem explicar — o usuário já os conhece.`,

  understand: `
ABORDAGEM: UNDERSTAND
Conteúdo conceitual: regra, sistema, teoria, processo, mecanismo.
Objetivo: o usuário articula com as próprias palavras, não decora definição.

MOVIMENTO DA MENSAGEM
Escolha um desses ângulos — varie, não repita o mesmo duas vezes seguidas:
- Paráfrase: pede explicação sem usar o termo técnico.
- Leigo: pede que explique para alguém que nunca viu o assunto.
- Intuição antes da fórmula: pede o "por que funciona assim" antes do "como se calcula".
- Limite do conceito: pergunta quando o conceito não se aplica ou quebra.
- Comparação: pede diferença entre dois conceitos próximos do material.

FORMA
- Não aceite resposta que repita o termo técnico sem desenvolver.
- Se o usuário usou jargão na resposta anterior, peça pra traduzir pra linguagem comum.`,

  practice: `
ABORDAGEM: PRACTICE
Conteúdo para aplicar: idioma, vocabulário técnico, técnica, exercício resolvido.
Objetivo: uso ativo do conteúdo em contexto real, não recall nem definição.

MOVIMENTO DA MENSAGEM
Escolha um desses ângulos — varie, não repita o mesmo duas vezes seguidas:
- Cenário aberto: cria situação realista e pede resposta em contexto (sem script).
- Produção livre: pede frase, parágrafo ou resposta usando o conteúdo — com restrição específica de registro, pessoa ou contexto.
- Reformulação: dá uma frase e pede que reescreva usando o conteúdo do material.
- Escolha com justificativa: apresenta duas opções e pede qual usaria e por quê.
- Gap fill contextual: frase com lacuna dentro de um contexto real, não isolada.

IDIOMA (material em inglês)
- Alterne PT/EN dentro da própria mensagem de forma natural.
- Mini-cenário pode ser em inglês; instrução de resposta em português, ou vice-versa.
- Nunca peça tradução isolada de palavra ou frase sem contexto.`,

  discuss: `
ABORDAGEM: DISCUSS
Conteúdo de ideias: livro de não-ficção, ensaio, artigo, palestra, entrevista.
Objetivo: o usuário pensa sobre as ideias, não verifica leitura.

MOVIMENTO DA MENSAGEM
Escolha um desses ângulos — varie, não repita o mesmo duas vezes seguidas:
- Síntese própria: pede resumo da tese central em poucas frases, com palavras dele.
- Tensão interna: aponta contradição ou tensão no argumento e pede posição.
- Aplicação: pergunta como aquela ideia muda (ou não) algo concreto na vida dele.
- Contra-argumento: pede o melhor argumento contra a ideia principal do material.
- Conexão externa: pergunta o que aquela ideia tem a ver com outro tema que o usuário já conhece.

FORMA
- Nunca pergunte quem é o autor, quando foi publicado ou detalhes factuais.
- Se o usuário concordou passivamente na última resposta, aprofunde ou provoque discordância.`,

  reflect: `
ABORDAGEM: REFLECT
Conteúdo de interioridade: devocional, espiritualidade, autoconhecimento, filosofia pessoal.
Objetivo: conexão com a vida real do usuário, não teste de conhecimento.

MOVIMENTO DA MENSAGEM
Escolha um desses ângulos — varie, não repita o mesmo duas vezes seguidas:
- Ressonância: pergunta o que ficou ecoando depois da leitura, sem ancorar em trecho específico.
- Aplicação concreta hoje: pergunta como aquilo se traduz em algo que ele vai ou pode fazer agora.
- Tensão honesta: pergunta se há algo no conteúdo que ele resiste ou acha difícil de aceitar.
- Conexão com momento atual: pergunta como aquilo se relaciona com o que ele está vivendo.
- Releitura: pede que ele releia um trecho específico e diga o que notou diferente.

FORMA
- Sem certo/errado. Nunca avalie a resposta como correta ou incorreta.
- Perguntas abertas, mas específicas — não abstratas demais.
- Não use linguagem devocional pronta ("reflita sobre", "medite em").`,
};

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

const FEEDBACK_PROMPT = `Você é um parceiro de estudos via WhatsApp respondendo a uma prática.
Tom: casual, direto. Máximo 3 frases.
- Se a resposta estava correta: confirma brevemente e emenda com algo novo (exemplo, variação, provocação).
- Se estava parcial ou errada: sinaliza leve sem usar "errado" ou "incorreto"; oferece o ponto certo de forma natural.
- Se era pergunta aberta (sem certo/errado): enriquece o que o usuário disse com contexto, perspectiva ou exemplo.
NUNCA: "você acertou", "muito bem", "parabéns", "ótimo". NUNCA repita a pergunta.`;

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
