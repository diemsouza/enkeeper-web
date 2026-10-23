// src/lib/audio-unlock.ts
// Declara explicitamente a categoria de sessão de áudio como "playback"
// no iOS/Safari, via API nativa do W3C (Safari 16.4+), pra áudio tocado
// via Web Audio API não ser silenciado pela chave física de silencioso.
// Substitui o hack antigo de <audio> silencioso em loop.

type AudioSessionType = "playback" | "play-and-record";

let applied = false;

function setAudioSessionType(type: AudioSessionType): void {
  const nav = navigator as Navigator & {
    audioSession?: { type: string };
  };

  if (nav.audioSession) {
    nav.audioSession.type = type;
  }
}

export function setupAudioUnlock(): void {
  if (typeof window === "undefined") return;
  if (applied) return;
  applied = true;
  setAudioSessionType("playback");
}

// Com a sessao fixa em "playback" o Safari nao captura o microfone: durante a
// gravacao ela vira "play-and-record" e volta ao fim.
export function setRecordingAudioSession(isRecording: boolean): void {
  if (typeof window === "undefined") return;
  setAudioSessionType(isRecording ? "play-and-record" : "playback");
}
