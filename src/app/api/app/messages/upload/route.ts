import { after } from "next/server";
import { ulid } from "ulid";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import type { IncomingMessage } from "@/src/types/domain";
import { isAcceptedVoiceNote } from "@/src/core/voice-note";
import {
  processVoiceNote,
  storeVoiceNote,
} from "@/src/services/voice-note-service";

// So nota de voz entra pelo chat; material vai pela modal de nova atividade
// (/api/app/activities).
export async function POST(request: Request): Promise<Response> {
  const receivedAt = new Date();

  try {
    const user = await requireAuth();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return Response.json({ error: "invalid form data" }, { status: 400 });
    }

    const mediaType = formData.get("mediaType");
    const file = formData.get("file");
    if (typeof mediaType !== "string" || !(file instanceof File)) {
      return Response.json({ error: "invalid form data fields" }, { status: 400 });
    }
    if (mediaType !== "audio") {
      return Response.json({ error: "unsupported mediaType" }, { status: 400 });
    }

    const externalIdField = formData.get("externalId");
    const resolvedExternalId =
      typeof externalIdField === "string" && externalIdField.trim().length > 0
        ? externalIdField.trim()
        : ulid();

    const baseInput: IncomingMessage = {
      userId: user.id,
      externalId: resolvedExternalId,
      receivedAt,
    };

    if (!isAcceptedVoiceNote(file.type, file.size)) {
      return Response.json({ error: "unsupported audio" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    // O upload e a confirmacao do envio; transcricao e avaliacao rodam depois
    // da resposta.
    const voiceNote = await storeVoiceNote(buffer, file.type);
    after(() => processVoiceNote(voiceNote, user.id, baseInput));
    return Response.json({ ok: true, externalId: resolvedExternalId });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("[post/api/app/messages/upload]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
