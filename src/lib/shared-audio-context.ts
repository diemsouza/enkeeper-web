// iOS Safari limita o numero de AudioContext por pagina; um so, compartilhado
// entre o player Ogg e a gravacao de voz.
let sharedContext: AudioContext | null = null;
let audioUnlocked = false;

// Safari pode lancar sincronamente ao construir o AudioContext (politica de
// autoplay, contextos demais). Retornar null e deixar o caller degradar em vez
// de propagar a excecao pra fora do event handler e travar a pagina.
export function getSharedAudioContext(): AudioContext | null {
  if (sharedContext) {
    if (sharedContext.state !== "closed") return sharedContext;
    // iOS as vezes fecha o AudioContext sozinho depois de um tempo em
    // segundo plano (nao so suspende). Um contexto "closed" nunca mais
    // resume - descartando e criando um novo dentro do proprio clique
    // (via unlockSharedAudioContext) resolve sem precisar de reload.
    sharedContext = null;
    audioUnlocked = false;
  }
  try {
    const Ctor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    sharedContext = new Ctor();
    return sharedContext;
  } catch (err) {
    console.error("[SharedAudioContext] audiocontext:", err);
    return null;
  }
}

export function isSharedAudioContext(ctx: AudioContext): boolean {
  return sharedContext === ctx;
}

export function hasSharedAudioContext(): boolean {
  return sharedContext !== null;
}

// Safari usa um estado "interrupted" (chamada, Siri, ou fundo prolongado)
// que resume() normalmente traz de volta a "running" sem precisar recriar
// o contexto - so "closed" e irrecuperavel.
export function canResumeAudioContext(state: AudioContextState): boolean {
  return state === "suspended" || state === "interrupted";
}

export function closeSharedAudioContext(): void {
  if (!sharedContext) return;
  sharedContext.close().catch(() => {
    // ja fechando/fechado
  });
  sharedContext = null;
  audioUnlocked = false;
}

// iOS exige que a saida de audio seja liberada dentro do gesto do usuario:
// um resume() apos await ja perde o gesto. Chamar isto sincronamente no clique,
// antes de qualquer await. O buffer silencioso de 1 sample e o que efetivamente
// destrava a saida no iOS quando o start() real vem depois do decode assincrono.
export function unlockSharedAudioContext(): AudioContext | null {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return null;
    if (canResumeAudioContext(ctx.state)) void ctx.resume();
    if (audioUnlocked) return ctx;
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    audioUnlocked = true;
    return ctx;
  } catch {
    audioUnlocked = false;
    return null;
  }
}
