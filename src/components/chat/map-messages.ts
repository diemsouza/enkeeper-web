import { MEDIA_INLINE_PARAM } from "@/src/lib/constants";
import { isStudyMessage } from "@/src/core/study-message";
import { isInaudibleTranscription } from "@/src/core/voice-note";
import { parseClientCommand } from "@/src/core/client-command";
import { CLIENT_COMMAND_INTENT } from "@/src/types/client-command";
import type { MessageWithMedia } from "@/src/repo/messages.repo";
import type { FormattedMessage } from "@/src/types/out-message";
import type { Message } from "./types";

type StoredInteractive = FormattedMessage["interactive"] | null;

type NormalizedRow = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  externalId: string | null;
  mediaType: string | null;
  mediaId: string | null;
  mediaContentType?: string | null;
  mediaMetadata?: unknown;
  metadata: unknown;
  interactive: unknown;
  questionId: string | null;
  intent: string | null;
};

export type FileLabels = {
  image: string;
  pdf: string;
  text: string;
  generic: string;
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function parsePgTimestamp(value: string): Date {
  const hasTimezone = /[Zz]|[+-]\d\d:?\d\d$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export function buildMediaUrl(
  mediaId: string,
  options: { inline?: boolean } = {},
): string {
  const query = options.inline ? `?${MEDIA_INLINE_PARAM}=1` : "";
  return `/api/app/media/${mediaId}${query}`;
}

function mediaTypeLabel(mediaType: string, labels: FileLabels): string {
  if (mediaType === "image") return labels.image;
  if (mediaType === "pdf") return labels.pdf;
  return labels.text;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseJsonMaybe(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readImageSize(
  mediaMetadata: unknown,
): { imageWidth: number; imageHeight: number } | undefined {
  if (!mediaMetadata || typeof mediaMetadata !== "object") return undefined;
  const { width, height } = mediaMetadata as Record<string, unknown>;
  if (typeof width !== "number" || typeof height !== "number") return undefined;
  if (width <= 0 || height <= 0) return undefined;
  return { imageWidth: width, imageHeight: height };
}

function toMessage(
  row: NormalizedRow,
  labels: FileLabels,
  feedbackTranslations: Record<string, string>,
): Message {
  const message = buildMessage(row, labels, feedbackTranslations);
  const isStudy = isStudyMessage({
    isUser: message.from === "user",
    intent: row.intent,
    questionId: row.questionId,
  });
  return { ...message, isStudy };
}

// Card do antigo passo de captura (nivel no chat): o nivel agora e trocado na
// modal, entao o clique no historico nao pode virar resposta de exercicio.
function readInteractive(raw: unknown): FormattedMessage["interactive"] {
  const interactive = (raw as StoredInteractive) ?? undefined;
  const isLegacyCaptureStep = Boolean(
    (raw as { isCaptureStep?: boolean } | null)?.isCaptureStep,
  );
  if (interactive && isLegacyCaptureStep) {
    return { ...interactive, disabled: true };
  }
  return interactive;
}

function buildMessage(
  row: NormalizedRow,
  labels: FileLabels,
  feedbackTranslations: Record<string, string>,
): Message {
  const from: Message["from"] = row.role === "user" ? "user" : "bot";
  const time = formatTime(row.createdAt);
  const date = row.createdAt.toISOString();
  const interactive = readInteractive(row.interactive);

  if (from === "bot" && row.intent === CLIENT_COMMAND_INTENT) {
    return {
      id: row.id,
      from,
      time,
      date,
      command: parseClientCommand(row.metadata),
    };
  }

  if (from === "bot" && row.mediaType === "image" && row.mediaId) {
    return {
      id: row.id,
      from,
      time,
      date,
      type: "image",
      imageUrl: buildMediaUrl(row.mediaId),
      ...readImageSize(row.mediaMetadata),
      caption: row.content,
      externalId: row.externalId ?? undefined,
      interactive,
    };
  }

  if (
    row.mediaType === "image" ||
    row.mediaType === "pdf" ||
    row.mediaType === "text"
  ) {
    const metadata =
      (row.metadata as Record<string, string | number | null>) ?? {};
    const fileName =
      typeof metadata.file_name === "string"
        ? metadata.file_name
        : labels.generic;
    const sizeBytes =
      typeof metadata.size_bytes === "number" ? metadata.size_bytes : 0;
    return {
      id: row.id,
      from,
      time,
      date,
      type: "file",
      fileName,
      fileSize: `${mediaTypeLabel(row.mediaType, labels)} · ${formatFileSize(sizeBytes)}`,
      mediaType: row.mediaType,
    };
  }

  // Audio da pergunta: a instrucao vai em cima do player e nunca ha traducao
  // (seria a resposta da pergunta).
  if (
    from === "bot" &&
    row.mediaType === "audio" &&
    row.mediaId &&
    row.intent === "practice_question"
  ) {
    return {
      id: row.id,
      from,
      time,
      date,
      type: "audio",
      audioKind: "question",
      audioUrl: buildMediaUrl(row.mediaId),
      audioContentType: row.mediaContentType ?? undefined,
      caption: row.content,
      externalId: row.externalId ?? undefined,
    };
  }

  if (row.mediaType === "audio" && row.mediaId) {
    const translation = row.questionId
      ? feedbackTranslations[row.questionId]
      : undefined;
    return {
      id: row.id,
      from,
      time,
      date,
      type: "audio",
      audioUrl: buildMediaUrl(row.mediaId),
      audioContentType: row.mediaContentType ?? undefined,
      textFallback: row.content,
      externalId: row.externalId ?? undefined,
      translation,
      transcription:
        from === "user" && !isInaudibleTranscription(row.content)
          ? row.content
          : undefined,
    };
  }

  return {
    id: row.id,
    from,
    text: row.content,
    time,
    date,
    externalId: row.externalId ?? undefined,
    interactive,
    isFirstFeedbackGuide: row.intent === "guide_after_first_feedback",
  };
}

export function mapActivityMessages(
  raw: MessageWithMedia[],
  labels: FileLabels,
  feedbackTranslations: Record<string, string> = {},
): Message[] {
  return raw.map((m) =>
    toMessage(
      {
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        externalId: m.externalId,
        mediaType: m.mediaType,
        mediaId: m.mediaId,
        mediaContentType: m.media?.contentType,
        mediaMetadata: m.media?.metadata,
        metadata: m.metadata,
        interactive: m.interactive,
        questionId: m.questionId,
        intent: m.intent,
      },
      labels,
      feedbackTranslations,
    ),
  );
}

export function mapBroadcastRecord(
  record: Record<string, unknown>,
  labels: FileLabels,
): Message {
  return toMessage(
    {
      id: String(record.id),
      role: String(record.role),
      content: typeof record.content === "string" ? record.content : "",
      createdAt: parsePgTimestamp(String(record.created_at)),
      externalId:
        typeof record.external_id === "string" ? record.external_id : null,
      mediaType:
        typeof record.media_type === "string" ? record.media_type : null,
      mediaId: typeof record.media_id === "string" ? record.media_id : null,
      metadata: parseJsonMaybe(record.metadata),
      interactive: parseJsonMaybe(record.interactive),
      questionId:
        typeof record.question_id === "string" ? record.question_id : null,
      intent: typeof record.intent === "string" ? record.intent : null,
    },
    labels,
    {},
  );
}
