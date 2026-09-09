"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PlayerState = "loading" | "ready" | "playing" | "paused" | "error";

type DecodedAudio = {
  channelData: Float32Array[];
  samplesDecoded: number;
  sampleRate: number;
};

const SPEEDS = [0.75, 1, 1.25] as const;
const WAVEFORM_BARS = 40;
const PROGRESS_TICK_MS = 100;

// iOS Safari limita o numero de AudioContext por pagina; um so, compartilhado.
let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedContext) {
    const Ctor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    sharedContext = new Ctor();
  }
  return sharedContext;
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
  const [rate, setRate] = useState<(typeof SPEEDS)[number]>(1);
  const [waveform, setWaveform] = useState<number[]>([]);

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

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let decoder: { free: () => void } | null = null;

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
        if (cancelled || controller.signal.aborted) return;
        console.error("[CustomAudioPlayer] load failed:", err);
        setState("error");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      decoder?.free();
    };
  }, [audioUrl]);

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
  }, []);

  const currentPosition = useCallback((): number => {
    const buffer = bufferRef.current;
    if (!buffer) return offsetRef.current;
    if (stateRef.current !== "playing") return offsetRef.current;
    const ctx = getAudioContext();
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
      stopSource();

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

      intervalRef.current = setInterval(() => {
        setProgress(currentPosition());
      }, PROGRESS_TICK_MS);
    },
    [getBuffer, stopSource, currentPosition],
  );

  const handlePlayPause = useCallback(async () => {
    if (stateRef.current === "loading" || stateRef.current === "error") return;
    const ctx = getAudioContext();
    if (ctx.state === "suspended") await ctx.resume();

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

  const cycleRate = useCallback(() => {
    setRate((prev) => {
      const next = SPEEDS[(SPEEDS.indexOf(prev) + 1) % SPEEDS.length];
      if (sourceRef.current) {
        const ctx = getAudioContext();
        offsetRef.current =
          offsetRef.current +
          (ctx.currentTime - startedAtRef.current) * rateRef.current;
        startedAtRef.current = ctx.currentTime;
        sourceRef.current.playbackRate.value = next;
      }
      rateRef.current = next;
      return next;
    });
  }, []);

  if (state === "error") {
    return (
      <div className="flex flex-col gap-1 py-1 min-w-[220px]">
        {textFallback ? (
          <p className="whitespace-pre-line leading-[1.5] break-words">
            {textFallback}
          </p>
        ) : (
          <p className="opacity-70">⚠️ Não foi possível carregar o áudio.</p>
        )}
      </div>
    );
  }

  const isLoading = state === "loading";
  const filledBars =
    duration > 0 ? Math.round((progress / duration) * WAVEFORM_BARS) : 0;

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[240px]">
      <button
        type="button"
        onClick={handlePlayPause}
        disabled={isLoading}
        aria-label={state === "playing" ? "Pausar" : "Tocar"}
        className="w-8 h-8 rounded-full bg-black/90 dark:bg-white/90 flex items-center justify-center shrink-0 disabled:opacity-60"
      >
        {isLoading ? (
          <span className="w-4 h-4 animate-spin rounded-full border-b-2 border-neutral-100 dark:border-neutral-900" />
        ) : state === "playing" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-4 h-4 fill-neutral-100 dark:fill-neutral-900"
          >
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-4 h-4 fill-neutral-100 dark:fill-neutral-900"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="relative h-6">
          <div className="absolute inset-0 flex items-center gap-[2px] overflow-hidden pointer-events-none">
            {(waveform.length > 0
              ? waveform
              : new Array(WAVEFORM_BARS).fill(0.15)
            ).map((height, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-current shrink-0"
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
            disabled={isLoading || duration === 0}
            onChange={(e) => handleSeek(Number(e.target.value))}
            aria-label="Posição do áudio"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
          />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] opacity-60 tabular-nums">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
          {/* Por enquanto nao adianta ter controle de velocidade, fica muito distorcido e altera muito a voz, talvez seja reajustado com instrucao no TTS via prompt por nivel */}
          {/* <button
            type="button"
            onClick={cycleRate}
            disabled={isLoading}
            className="text-[10px] opacity-60 font-medium tabular-nums disabled:opacity-40"
          >
            {rate}×
          </button> */}
        </div>
      </div>
    </div>
  );
}
