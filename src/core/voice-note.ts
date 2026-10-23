import {
  VOICE_ACCEPTED_CONTENT_TYPES,
  VOICE_MAX_BYTES,
} from "../lib/constants";

const AUDIO_EXTENSION_BY_MIME: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/opus": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "m4a",
  "audio/mpeg": "mp3",
  "audio/webm": "webm",
};

export function baseMimeType(mimeType: string): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

export function audioExtensionForMime(mimeType: string): string {
  const base = baseMimeType(mimeType);
  return AUDIO_EXTENSION_BY_MIME[base] ?? base.split("/")[1] ?? "ogg";
}

// Construtor em vez de literal: o target do tsconfig (es5) nao aceita a flag u.
const LETTER_PATTERN = new RegExp("\\p{L}", "u");
const EDGE_PUNCTUATION_PATTERN = new RegExp(
  "^[\\p{P}\\p{S}\\s]+|[\\p{P}\\p{S}\\s]+$",
  "gu",
);

// Silencio ou ruido viram transcricao vazia ou so pontuacao: sem nenhuma
// letra nao ha resposta para avaliar.
export function isInaudibleTranscription(text: string): boolean {
  return !LETTER_PATTERN.test(text);
}

export function isAcceptedVoiceNote(
  mimeType: string,
  sizeBytes: number,
): boolean {
  return (
    VOICE_ACCEPTED_CONTENT_TYPES.includes(baseMimeType(mimeType)) &&
    sizeBytes > 0 &&
    sizeBytes <= VOICE_MAX_BYTES
  );
}

// O Whisper devolve "Menu." ou " Pausar 2!": sem as pontas a transcricao cai
// na mesma deteccao de comando do texto digitado.
export function normalizeVoiceCommandText(text: string): string {
  return text.replace(EDGE_PUNCTUATION_PATTERN, "").toLowerCase().trim();
}
