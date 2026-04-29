import { generateText, NoObjectGeneratedError, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { extractText } from 'unpdf'
import { docProcessingSchema, DocProcessingResult, visionSchema, VisionResult } from '../lib/llm-schemas'
import { parseJsonWithFallback } from '../lib/json-utils'

const MODEL = 'gpt-4.1-mini'

// ─── Doc extraction ───────────────────────────────────────────────────────────

const buildDocPrompt = (rawContent: string) => `Você recebeu um conteúdo de estudo. Extraia:
- title: título curto (máx 8 palavras) que resuma o tema
- topics: lista de 8 a 12 tópicos principais para praticar (strings curtas)
- content: reescreva o conteúdo de forma clara e objetiva, mantendo todas as informações importantes para estudo espaçado

Conteúdo:
${rawContent}`

export async function generateDocTopics(params: {
  rawContent: string
  docType: string
}): Promise<{
  result: DocProcessingResult | null
  inputTokens: number
  outputTokens: number
}> {
  try {
    const llmResult = await generateText({
      model: openai(MODEL),
      output: Output.object({ schema: docProcessingSchema }),
      temperature: 0.2,
      prompt: buildDocPrompt(params.rawContent),
    })
    return {
      result: llmResult.output,
      inputTokens: llmResult.usage?.inputTokens ?? 0,
      outputTokens: llmResult.usage?.outputTokens ?? 0,
    }
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err) && err.text) {
      try {
        return {
          result: docProcessingSchema.parse(parseJsonWithFallback(err.text.trim())),
          inputTokens: 0,
          outputTokens: 0,
        }
      } catch {
        // structured parse failed after NoObjectGeneratedError
      }
    }
    return { result: null, inputTokens: 0, outputTokens: 0 }
  }
}

// ─── Practice message generation ─────────────────────────────────────────────

const PRACTICE_SYSTEM = `Você é um parceiro de prática de estudos via WhatsApp.
Tom: casual, direto, primeira pessoa do plural. Nunca didático ou formal.
Máximo 3 linhas por mensagem.

Varie o formato a cada mensagem — nunca repita o mesmo estilo consecutivo:
- Pergunta direta em português sobre o tópico
- Pergunta direta no idioma do material (se for inglês, pergunta em inglês)
- Fill-in-the-blank: "Como você completaria: ___ ?"
- Role-play curto: "Imagina que você está em X situação. Como diria Y?"
- Provocação: "Aposto que você não lembra como se diz X. Tenta aí."
- Exemplo + pergunta: dá um exemplo e pergunta se o usuário usaria diferente

Se lastUserReply existir, reaja brevemente à resposta antes de ir pro próximo tópico.
Nunca corrija explicitamente — só estimule.
Se o material for em inglês, alterne perguntas em português e inglês.`

export async function generatePracticeMessage(params: {
  topic: string
  lastUserReply: string | null
  docContent: string
  topicIndex: number
  totalTopics: number
}): Promise<string> {
  const { topic, lastUserReply, docContent, topicIndex, totalTopics } = params

  const userPrompt = [
    `Tópico atual (${topicIndex + 1}/${totalTopics}): ${topic}`,
    `Use um formato diferente dos anteriores (tópico ${topicIndex + 1} de ${totalTopics}).`,
    lastUserReply ? `Última resposta do usuário: "${lastUserReply}"` : null,
    `\nTrecho do material:\n${docContent.slice(0, 1500)}`,
  ]
    .filter(Boolean)
    .join('\n')

  const result = await generateText({
    model: openai(MODEL),
    system: PRACTICE_SYSTEM,
    prompt: userPrompt,
    temperature: 0.7,
  })

  return result.text.trim()
}

// ─── PDF extraction ───────────────────────────────────────────────────────────

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer))
  return Array.isArray(text) ? text.join('\n') : text
}

// ─── Image transcription ──────────────────────────────────────────────────────

export async function extractTextFromImage(buffer: Buffer): Promise<VisionResult> {
  const llmResult = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({ schema: visionSchema }),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', image: buffer },
          {
            type: 'text',
            text: 'Se a imagem contiver texto legível, extraia o texto exatamente como está. Caso contrário, descreva de forma concisa o que a imagem mostra. Defina transcription_type como "text" se havia texto legível ou "description" se foi gerada uma descrição.',
          },
        ],
      },
    ],
  })

  return llmResult.output as VisionResult
}
