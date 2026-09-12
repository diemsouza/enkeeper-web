import type { Message as PrismaMessage } from "@/src/lib/prisma";
import type { FormattedMessageButton, Message } from "./types";

type StoredInteractive = {
  body: string;
  buttons: FormattedMessageButton[];
} | null;

type NormalizedRow = {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  externalId: string | null;
  mediaType: string | null;
  mediaId: string | null;
  metadata: unknown;
  interactive: unknown;
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

export function buildMediaUrl(mediaId: string): string {
  return `/api/app/media/${mediaId}`;
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

function toMessage(row: NormalizedRow, labels: FileLabels): Message {
  const from: Message["from"] = row.role === "user" ? "user" : "bot";
  const time = formatTime(row.createdAt);
  const date = row.createdAt.toISOString();
  const interactive = (row.interactive as StoredInteractive) ?? undefined;

  if (from === "bot" && row.mediaType === "image" && row.mediaId) {
    return {
      id: row.id,
      from,
      time,
      date,
      type: "image",
      imageUrl: buildMediaUrl(row.mediaId),
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

  if (row.mediaType === "audio" && row.mediaId) {
    return {
      id: row.id,
      from,
      time,
      date,
      type: "audio",
      audioUrl: buildMediaUrl(row.mediaId),
      textFallback: row.content,
      externalId: row.externalId ?? undefined,
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
  };
}

export function mapActivityMessages(
  raw: PrismaMessage[],
  labels: FileLabels,
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
        metadata: m.metadata,
        interactive: m.interactive,
      },
      labels,
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
    },
    labels,
  );
}
