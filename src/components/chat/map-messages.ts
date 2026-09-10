import type { Message as PrismaMessage } from "@/src/lib/prisma";
import type { FormattedMessageButton, Message } from "./types";

type StoredInteractive = {
  body: string;
  buttons: FormattedMessageButton[];
} | null;

function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildMediaUrl(mediaId: string): string {
  return `/api/app/media/${mediaId}`;
}

function mediaTypeLabel(mediaType: string): string {
  if (mediaType === "image") return "Imagem";
  if (mediaType === "pdf") return "PDF";
  return "Texto";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mapActivityMessages(raw: PrismaMessage[]): Message[] {
  return raw.map((m) => {
    const from: Message["from"] = m.role === "user" ? "user" : "bot";
    const time = formatTime(m.createdAt);
    const date = m.createdAt.toISOString();
    const interactive = (m.interactive as StoredInteractive) ?? undefined;

    if (from === "bot" && m.mediaType === "image" && m.mediaId) {
      return {
        id: m.id,
        from,
        time,
        date,
        type: "image",
        imageUrl: buildMediaUrl(m.mediaId),
        caption: m.content,
        externalId: m.externalId ?? undefined,
        interactive,
      };
    }

    if (
      m.mediaType === "image" ||
      m.mediaType === "pdf" ||
      m.mediaType === "text"
    ) {
      const metadata =
        (m.metadata as Record<string, string | number | null>) ?? {};
      const fileName =
        typeof metadata.file_name === "string" ? metadata.file_name : "Arquivo";
      const sizeBytes =
        typeof metadata.size_bytes === "number" ? metadata.size_bytes : 0;
      return {
        id: m.id,
        from,
        time,
        date,
        type: "file",
        fileName,
        fileSize: `${mediaTypeLabel(m.mediaType)} · ${formatFileSize(sizeBytes)}`,
        mediaType: m.mediaType,
      };
    }

    if (m.mediaType === "audio" && m.mediaId) {
      return {
        id: m.id,
        from,
        time,
        date,
        type: "audio",
        audioUrl: buildMediaUrl(m.mediaId),
        textFallback: m.content,
        externalId: m.externalId ?? undefined,
      };
    }

    return {
      id: m.id,
      from,
      text: m.content,
      time,
      date,
      interactive,
    };
  });
}
