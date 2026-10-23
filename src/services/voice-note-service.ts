import { ulid } from "ulid";
import { uploadFile } from "../vendors/storage.vendor";
import { transcribeAudio } from "../vendors/whisper.vendor";
import { createMedia } from "../repo/media.repo";
import { readAudioDuration } from "./feedback-audio-service";
import { handleIncomingMessage } from "./message-service";
import { resolveChannel } from "../lib/channels/resolve-channel";
import {
  ANSWER_AUDIO_FOLDER,
  MEDIA_PARENT_TYPE,
  MEDIA_SOURCE,
  MEDIA_TYPE,
} from "../lib/constants";
import { buildMediaPath } from "../lib/utils";
import { audioExtensionForMime, baseMimeType } from "../core/voice-note";
import type { IncomingMessage } from "../types/domain";

export type StoredVoiceNote = {
  mediaId: string;
  mediaPath: string;
  contentType: string;
  buffer: Buffer;
};

type TranscribedVoiceNote = { text: string; duration: number | null };

export async function storeVoiceNote(
  buffer: Buffer,
  mimeType: string,
): Promise<StoredVoiceNote> {
  const contentType = baseMimeType(mimeType);
  const mediaId = ulid();
  const mediaPath = buildMediaPath(
    ANSWER_AUDIO_FOLDER,
    mediaId,
    audioExtensionForMime(contentType),
  );
  await uploadFile({
    filePath: mediaPath,
    file: new Blob([new Uint8Array(buffer)], { type: contentType }),
  });
  return { mediaId, mediaPath, contentType, buffer };
}

// Falha do Whisper segue com transcricao vazia: o fluxo responde pedindo
// para gravar de novo em vez de deixar o usuario sem retorno.
async function transcribeVoiceNote(
  voiceNote: StoredVoiceNote,
): Promise<TranscribedVoiceNote> {
  try {
    const result = await transcribeAudio(
      voiceNote.buffer,
      voiceNote.contentType,
    );
    const duration =
      result.duration ??
      (await readAudioDuration(voiceNote.buffer, voiceNote.contentType));
    return { text: result.text.trim(), duration };
  } catch (err) {
    console.error("[transcribeVoiceNote] failed:", voiceNote.mediaId, err);
    return { text: "", duration: null };
  }
}

export async function processVoiceNote(
  voiceNote: StoredVoiceNote,
  userId: string,
  input: IncomingMessage,
): Promise<void> {
  const { text, duration } = await transcribeVoiceNote(voiceNote);
  const messageId = ulid();
  await createMedia({
    id: voiceNote.mediaId,
    userId,
    source: MEDIA_SOURCE.USER,
    parentId: messageId,
    parentType: MEDIA_PARENT_TYPE.MESSAGE,
    mediaType: MEDIA_TYPE.AUDIO,
    contentType: voiceNote.contentType,
    mediaPath: voiceNote.mediaPath,
    mediaSize: voiceNote.buffer.length,
    mediaTranscription: text,
    metadata: duration !== null ? { duration } : undefined,
  });
  await handleIncomingMessage(
    {
      ...input,
      text,
      isVoiceNote: true,
      messageId,
      mediaType: MEDIA_TYPE.AUDIO,
      mediaId: voiceNote.mediaId,
    },
    resolveChannel(),
  );
}
