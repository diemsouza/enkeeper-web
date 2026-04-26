import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { visionSchema, VisionResult } from '../lib/llm-schemas'

export async function extractTextFromImage(
  buffer: Buffer,
): Promise<VisionResult> {
  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: visionSchema,
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

  return result.object
}
