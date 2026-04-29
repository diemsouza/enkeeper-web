import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { handleIncomingMessage } from "../../../services/message-service";
import { ChannelType } from "../../../types/domain";
import { findUserByChannel } from "../../../repo/users.repo";
import { findMessagesSince } from "../../../repo/messages.repo";

const bodySchema = z.object({
  channelId: z.string().min(1),
  channelCode: z.string().optional().nullable(),
  channelType: z.enum(["whatsapp"]),
  text: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  externalId: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
});

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-simulate-secret");
  return !!secret && secret === process.env.SIMULATE_SECRET;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!checkSecret(req)) return unauthorized();

  const { searchParams } = req.nextUrl;
  const channelId = searchParams.get("channelId");
  const since = searchParams.get("since");

  if (!channelId || !since) {
    return NextResponse.json({ error: "channelId and since are required" }, { status: 400 });
  }

  const sinceDate = new Date(since);
  if (isNaN(sinceDate.getTime())) {
    return NextResponse.json({ error: "invalid since date" }, { status: 400 });
  }

  const user = await findUserByChannel("whatsapp", channelId);
  if (!user) return NextResponse.json({ messages: [] });

  const messages = await findMessagesSince(user.id, sinceDate);
  return NextResponse.json({
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!checkSecret(req)) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { channelId, channelCode, channelType, text, imageUrl, externalId, mediaType } = parsed.data;

  try {
    const reply = await handleIncomingMessage({
      channelId,
      channelCode: channelCode ?? undefined,
      channelType: channelType as ChannelType,
      text: text ?? undefined,
      imageUrl: imageUrl ?? undefined,
      externalId: externalId ?? undefined,
      mediaType: mediaType ?? undefined,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === "P2002") {
      console.log(`[SIMULATE] duplicate message ignored ${externalId}`);
      return NextResponse.json({ reply: [] });
    }
    console.log(err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
