// src/lib/audio-unlock.ts
// Declara explicitamente a categoria de sessão de áudio como "playback"
// no iOS/Safari, via API nativa do W3C (Safari 16.4+), pra áudio tocado
// via Web Audio API não ser silenciado pela chave física de silencioso.
// Substitui o hack antigo de <audio> silencioso em loop.

let applied = false;

export function setupAudioUnlock(): void {
  if (typeof window === "undefined") return;
  if (applied) return;
  applied = true;

  const nav = navigator as Navigator & {
    audioSession?: { type: string };
  };

  if (nav.audioSession) {
    nav.audioSession.type = "playback";
  }
}
