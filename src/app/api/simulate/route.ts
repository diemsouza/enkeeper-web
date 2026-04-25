import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { handleIncomingMessage } from '../../../services/message-service'
import { ChannelType } from '../../../types/domain'

const bodySchema = z.object({
  channelId: z.string().min(1),
  channelCode: z.string().optional().nullable(),
  channelType: z.enum(['whatsapp']),
  text: z.string().optional().nullable(),
  audioUrl: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  externalId: z.string().optional().nullable(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-simulate-secret')
  if (!secret || secret !== process.env.SIMULATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 })
  }

  const { channelId, channelCode, channelType, text, audioUrl, imageUrl, externalId } = parsed.data

  try {
    const reply = await handleIncomingMessage({
      channelId,
      channelCode: channelCode ?? undefined,
      channelType: channelType as ChannelType,
      text: text ?? undefined,
      audioUrl: audioUrl ?? undefined,
      imageUrl: imageUrl ?? undefined,
      externalId: externalId ?? undefined,
    })
    return NextResponse.json({ reply })
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
      console.log(`[SIMULATE] duplicate message ignored ${externalId}`)
      return NextResponse.json({ reply: null })
    }
    const message = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
