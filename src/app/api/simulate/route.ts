import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "../../../lib/prisma";
import { handleIncomingMessage } from "../../../services/message-service";
import { findOrCreateUserByChannel } from "../../../services/user-service";
import { ChannelType } from "../../../types/domain";
import { sendSimulatorMessages } from "../../../lib/simulator";
import { emitToSession } from "../../../lib/simulator-emitter";
import {
  extractTextFromImage,
  extractTextFromPdf,
} from "../../../vendors/llm.vendor";
import { formatImageNoText } from "../../../core/formatters";

const jsonSchema = z.object({
  channelId: z.string().min(1),
  channelCode: z.string().optional().nullable(),
  channelType: z.enum(["whatsapp"]),
  text: z.string().optional().nullable(),
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const receivedAt = new Date();
  if (!checkSecret(req)) return unauthorized();

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const channelId = formData.get("channelId");
    const channelCode = formData.get("channelCode");
    const channelType = formData.get("channelType");
    const mediaType = formData.get("mediaType");
    const externalId = formData.get("externalId");
    const file = formData.get("file");

    if (
      typeof channelId !== "string" ||
      !channelId ||
      typeof channelType !== "string" ||
      channelType !== "whatsapp" ||
      typeof mediaType !== "string" ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { error: "Invalid form data fields" },
        { status: 400 },
      );
    }

    let extractedText: string;
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (mediaType === "image") {
        const user = await findOrCreateUserByChannel("whatsapp", channelId);
        const visionResult = await extractTextFromImage(buffer, user.id);
        if (visionResult.transcription_type === "description") {
          const noTextMsg = formatImageNoText();
          emitToSession(channelId, {
            type: "message",
            text: noTextMsg,
            time: new Date().toISOString(),
          });
          emitToSession(channelId, { type: "done" });
          return NextResponse.json({ ok: true });
        }
        extractedText = visionResult.content;
      } else if (mediaType === "pdf") {
        extractedText = await extractTextFromPdf(buffer);
      } else {
        return NextResponse.json(
          { error: "Unsupported mediaType" },
          { status: 400 },
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction error";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    try {
      const replies = await handleIncomingMessage({
        channelId,
        channelCode: typeof channelCode === "string" ? channelCode : undefined,
        channelType: channelType as ChannelType,
        text: extractedText,
        externalId: typeof externalId === "string" ? externalId : undefined,
        mediaType: mediaType ?? undefined,
        receivedAt,
      });
      void sendSimulatorMessages(channelId, replies);
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json({ ok: true });
      }
      const message = err instanceof Error ? err.message : "Erro interno";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = jsonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { channelId, channelCode, channelType, text, externalId, mediaType } =
    parsed.data;

  try {
    const replies = await handleIncomingMessage({
      channelId,
      channelCode: channelCode ?? undefined,
      channelType: channelType as ChannelType,
      text: text ?? undefined,
      externalId: externalId ?? undefined,
      mediaType: mediaType ?? undefined,
      receivedAt,
    });
    void sendSimulatorMessages(channelId, replies);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      console.log(`[SIMULATE] duplicate message ignored ${externalId}`);
      return NextResponse.json({ ok: true });
    }
    console.log(err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
