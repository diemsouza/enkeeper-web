import { generateText, NoObjectGeneratedError, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { docProcessingSchema, DocProcessingResult } from '../lib/llm-schemas'
import { parseJsonWithFallback } from '../lib/json-utils'

const MODEL = 'gpt-4.1-mini'

const buildExtractPrompt = (rawContent: string) => `Você recebeu um conteúdo de estudo. Extraia:
- title: título curto (máx 8 palavras) que resuma o tema
- topics: lista dos tópicos principais para praticar (strings curtas, máx 10 tópicos)
- content: reescreva o conteúdo de forma clara e objetiva, mantendo todas as informações importantes para estudo espaçado

Conteúdo:
${rawContent}`

export async function extractDocContent(rawContent: string): Promise<{
  result: DocProcessingResult | null
  inputTokens: number
  outputTokens: number
}> {
  try {
    const llmResult = await generateText({
      model: openai(MODEL),
      output: Output.object({ schema: docProcessingSchema }),
      temperature: 0.2,
      prompt: buildExtractPrompt(rawContent),
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
