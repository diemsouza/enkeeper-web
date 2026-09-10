"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PlayerState = "loading" | "ready" | "playing" | "paused" | "error";

type DecodedAudio = {
  channelData: Float32Array[];
  samplesDecoded: number;
  sampleRate: number;
};

const WAVEFORM_BARS = 40;
const PROGRESS_TICK_MS = 100;
const LOAD_TIMEOUT_MS = 20000;

// iOS Safari limita o numero de AudioContext por pagina; um so, compartilhado.
let sharedContext: AudioContext | null = null;
let audioUnlocked = false;

// Safari pode lancar sincronamente ao construir o AudioContext (politica de
// autoplay, contextos demais). Retornar null e deixar o caller degradar em vez
// de propagar a excecao pra fora do event handler e travar a pagina.
function getAudioContext(): AudioContext | null {
  if (sharedContext) return sharedContext;
  try {
    const Ctor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    sharedContext = new Ctor();
    return sharedContext;
  } catch (err) {
    console.error("[CustomAudioPlayer] audiocontext:", err);
    return null;
  }
}

// iOS exige que a saida de audio seja liberada dentro do gesto do usuario:
// um resume() apos await ja perde o gesto. Chamar isto sincronamente no clique,
// antes de qualquer await. O buffer silencioso de 1 sample e o que efetivamente
// destrava a saida no iOS quando o start() real vem depois do decode assincrono.
function unlockAudioContext(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    if (audioUnlocked) return;
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    audioUnlocked = true;
  } catch {
    audioUnlocked = false;
  }
}

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildWaveform(samples: Float32Array, bars: number): number[] {
  const bucket = Math.floor(samples.length / bars) || 1;
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    let peak = 0;
    const start = i * bucket;
    const end = Math.min(start + bucket, samples.length);
    for (let j = start; j < end; j++) {
      const value = Math.abs(samples[j]);
      if (value > peak) peak = value;
    }
    peaks.push(peak);
  }
  const max = Math.max(...peaks, 0.0001);
  return peaks.map((peak) => peak / max);
}

export function CustomAudioPlayer({
  audioUrl,
  externalId,
  onPlay,
  textFallback,
}: {
  audioUrl: string;
  externalId?: string;
  onPlay?: (externalId: string) => void;
  textFallback?: string;
}) {
  const [state, setState] = useState<PlayerState>("loading");
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [showErrorHint, setShowErrorHint] = useState(false);

  const decodedRef = useRef<DecodedAudio | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const rateRef = useRef(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playFiredRef = useRef(false);
  const stateRef = useRef<PlayerState>("loading");
  stateRef.current = state;

  const fail = useCallback((reason: string, err?: unknown): void => {
    console.error(`[CustomAudioPlayer] ${reason}`, err);
    setState("error");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    let decoder: { free: () => void } | null = null;

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch(audioUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const bytes = new Uint8Array(await res.arrayBuffer());

        const { OggOpusDecoder } = await import("ogg-opus-decoder");
        const instance = new OggOpusDecoder();
        decoder = instance;
        await instance.ready;
        const decoded = await instance.decodeFile(bytes);
        instance.free();
        decoder = null;
        if (cancelled) return;

        if (decoded.samplesDecoded === 0) throw new Error("empty decode");

        decodedRef.current = {
          channelData: decoded.channelData,
          samplesDecoded: decoded.samplesDecoded,
          sampleRate: decoded.sampleRate,
        };
        setDuration(decoded.samplesDecoded / decoded.sampleRate);
        setWaveform(buildWaveform(decoded.channelData[0], WAVEFORM_BARS));
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        if (timedOut) {
          fail("load timeout");
          return;
        }
        if (controller.signal.aborted) return;
        fail("load failed", err);
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
      try {
        decoder?.free();
      } catch (err) {
        console.error("[CustomAudioPlayer] decoder cleanup:", err);
      }
    };
  }, [audioUrl, fail]);

  const stopTicker = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopSource = useCallback(() => {
    const source = sourceRef.current;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        // já parado
      }
      source.disconnect();
      sourceRef.current = null;
    }
    stopTicker();
  }, [stopTicker]);

  useEffect(() => stopSource, [stopSource]);

  const getBuffer = useCallback((): AudioBuffer | null => {
    if (bufferRef.current) return bufferRef.current;
    const decoded = decodedRef.current;
    if (!decoded) return null;
    const ctx = getAudioContext();
    if (!ctx) {
      fail("audiocontext");
      return null;
    }
    try {
      const buffer = ctx.createBuffer(
        decoded.channelData.length,
        decoded.samplesDecoded,
        decoded.sampleRate,
      );
      decoded.channelData.forEach((channel, i) =>
        buffer.getChannelData(i).set(channel),
      );
      bufferRef.current = buffer;
      return buffer;
    } catch (err) {
      fail("buffer", err);
      return null;
    }
  }, [fail]);

  const currentPosition = useCallback((): number => {
    const buffer = bufferRef.current;
    if (!buffer) return offsetRef.current;
    if (stateRef.current !== "playing") return offsetRef.current;
    const ctx = getAudioContext();
    if (!ctx) return offsetRef.current;
    const pos =
      offsetRef.current +
      (ctx.currentTime - startedAtRef.current) * rateRef.current;
    return Math.min(pos, buffer.duration);
  }, []);

  const startPlayback = useCallback(
    (fromSeconds: number) => {
      const buffer = getBuffer();
      if (!buffer) return;
      const ctx = getAudioContext();
      if (!ctx) {
        fail("audiocontext");
        return;
      }
      stopSource();

      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = rateRef.current;
        source.connect(ctx.destination);
        source.onended = () => {
          if (sourceRef.current !== source) return;
          stopSource();
          offsetRef.current = 0;
          setProgress(0);
          setState("ready");
        };

        offsetRef.current = fromSeconds;
        startedAtRef.current = ctx.currentTime;
        source.start(
          0,
          Math.min(fromSeconds, Math.max(buffer.duration - 0.01, 0)),
        );
        sourceRef.current = source;
        setState("playing");
      } catch (err) {
        stopSource();
        fail("playback", err);
        return;
      }

      intervalRef.current = setInterval(() => {
        setProgress(currentPosition());
      }, PROGRESS_TICK_MS);
    },
    [getBuffer, stopSource, currentPosition, fail],
  );

  const handlePlayPause = useCallback(() => {
    if (stateRef.current === "error") {
      setShowErrorHint(true);
      return;
    }
    unlockAudioContext();
    if (stateRef.current === "loading") return;

    if (stateRef.current === "playing") {
      const pos = currentPosition();
      stopSource();
      offsetRef.current = pos;
      setProgress(pos);
      setState("paused");
      return;
    }

    if (!playFiredRef.current && externalId) {
      playFiredRef.current = true;
      onPlay?.(externalId);
    }

    const total = decodedRef.current
      ? decodedRef.current.samplesDecoded / decodedRef.current.sampleRate
      : 0;
    const from = offsetRef.current >= total - 0.05 ? 0 : offsetRef.current;
    startPlayback(from);
  }, [currentPosition, stopSource, externalId, onPlay, startPlayback]);

  const handleSeek = useCallback(
    (seconds: number) => {
      const total = duration;
      const clamped = Math.max(0, Math.min(seconds, total));
      offsetRef.current = clamped;
      setProgress(clamped);
      if (stateRef.current === "playing") startPlayback(clamped);
    },
    [duration, startPlayback],
  );

  const isLoading = state === "loading";
  const isError = state === "error";
  const filledBars =
    duration > 0 ? Math.round((progress / duration) * WAVEFORM_BARS) : 0;
  const showElapsed = state === "playing" || state === "paused";
  const displayTime = showElapsed ? progress : duration;
  const thumbLeft =
    duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className="flex flex-col gap-1 py-1 min-w-[260px]">
      <div
        className={`flex items-center gap-3${isError ? " text-destructive" : ""}`}
      >
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={isLoading}
          aria-label={state === "playing" ? "Pausar" : "Tocar"}
          className="shrink-0 p-1 disabled:opacity-60"
        >
          {isLoading ? (
            <span className="block w-5 h-5 animate-spin rounded-full border-b-2 border-current" />
          ) : state === "playing" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-7 h-7 fill-current"
            >
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-7 h-7 fill-current"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1 relative min-w-0">
          <div className="relative h-6">
            <div className="absolute inset-0 flex items-center gap-[2px] pointer-events-none">
              {(waveform.length > 0
                ? waveform
                : new Array(WAVEFORM_BARS).fill(0.15)
              ).map((height, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-current"
                  style={{
                    height: `${Math.max(3, height * 22)}px`,
                    opacity: i < filledBars ? 0.85 : 0.3,
                  }}
                />
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={progress}
              disabled={isLoading || isError || duration === 0}
              onChange={(e) => handleSeek(Number(e.target.value))}
              aria-label="Posição do áudio"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
            />
            {duration > 0 && (
              <div
                className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow pointer-events-none"
                style={{ left: `${thumbLeft}%` }}
              />
            )}
          </div>
          <span className="absolute left-0 top-full mt-0.5 text-[10px] opacity-60 tabular-nums">
            {formatTime(displayTime)}
          </span>
        </div>

        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-neutral-100 dark:fill-neutral-900"
            >
              <rect x="3" y="9" width="2" height="6" rx="1" />
              <rect x="7" y="6" width="2" height="12" rx="1" />
              <rect x="11" y="3.5" width="2" height="17" rx="1" />
              <rect x="15" y="6" width="2" height="12" rx="1" />
              <rect x="19" y="9" width="2" height="6" rx="1" />
            </svg>
          </div>
          <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-neutral-700 dark:bg-neutral-300 flex items-center justify-center ring-2 ring-white dark:ring-[#1C1C1E]">
            <svg
              viewBox="0 0 24 24"
              className="w-3 h-3 fill-neutral-100 dark:fill-neutral-900"
            >
              <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
              <path d="M17 11a1 1 0 10-2 0 3 3 0 01-6 0 1 1 0 10-2 0 5 5 0 004 4.9V18H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.1a5 5 0 004-4.9z" />
            </svg>
          </div>
        </div>
      </div>

      {isError && textFallback && (
        <p className="mt-1 whitespace-pre-line leading-[1.5] break-words opacity-80">
          {textFallback}
        </p>
      )}
      {isError && showErrorHint && (
        <p className="mt-0.5 text-[11px] text-destructive">
          Não foi possível carregar este áudio.
        </p>
      )}
    </div>
  );
}
