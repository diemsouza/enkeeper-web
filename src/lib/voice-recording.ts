import { audioExtensionForMime, baseMimeType } from "@/src/core/voice-note";

// Ordem de preferencia: Ogg/Opus direto (Firefox), WebM/Opus remuxado para Ogg
// (Chrome, Android, Safari 18.4+) e AAC em MP4 (Safari 14.1 a 18.3). So
// formatos que o player toca.
const RECORDER_MIME_TYPES = [
  "audio/ogg;codecs=opus",
  "audio/webm;codecs=opus",
  "audio/mp4",
];
const OPUS_BITRATE = 32_000;
const AAC_BITRATE = 64_000;
const VOICE_FILE_NAME = "voice";

export type PermissionPlatform = "ios" | "android" | "mac_safari" | "desktop";

export function pickRecorderMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  if (typeof MediaRecorder.isTypeSupported !== "function") return null;
  return (
    RECORDER_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ??
    null
  );
}

export function canRecordVoice(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.mediaDevices?.getUserMedia !== "function") return false;
  return pickRecorderMimeType() !== null;
}

export function recorderBitrate(mimeType: string): number {
  return baseMimeType(mimeType) === "audio/mp4" ? AAC_BITRATE : OPUS_BITRATE;
}

function isWebm(mimeType: string): boolean {
  return baseMimeType(mimeType) === "audio/webm";
}

// A lib de remux so carrega no caminho WebM. Comeca a baixar junto com a
// gravacao para nao atrasar o envio.
export function preloadVoiceRemux(mimeType: string): void {
  if (!isWebm(mimeType)) return;
  import("@/src/lib/webm-to-ogg").catch((err: unknown) =>
    console.error("[preloadVoiceRemux] failed:", err),
  );
}

export async function buildVoiceNoteFile(recording: Blob): Promise<File> {
  const blob = isWebm(recording.type)
    ? await (await import("@/src/lib/webm-to-ogg")).remuxWebmToOgg(recording)
    : recording;
  const type = baseMimeType(blob.type);
  return new File([blob], `${VOICE_FILE_NAME}.${audioExtensionForMime(type)}`, {
    type,
  });
}

export function detectPermissionPlatform(): PermissionPlatform {
  const ua = navigator.userAgent;
  // iPadOS se apresenta como Mac; o toque diferencia.
  const isIos =
    /iPhone|iPad|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIos) return "ios";
  if (/Android/.test(ua)) return "android";
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
  return isSafari ? "mac_safari" : "desktop";
}
