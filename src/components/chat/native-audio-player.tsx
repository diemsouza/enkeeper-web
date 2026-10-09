"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Spinner } from "@/src/components/ui/spinner";

export type AudioPlayerProps = {
  audioUrl: string;
  externalId?: string;
  onPlay?: (externalId: string) => void;
  textFallback?: string;
  translation?: string;
  time?: string;
  fluid?: boolean;
  onExport?: (event: SyntheticEvent) => void;
};

type PlayerState = "ready" | "playing" | "paused" | "error";

const WAVEFORM_BARS = 40;
const WAVEFORM_IDLE_HEIGHT = 0.15;
const DECODE_RETRY_MS = 500;
const READY_FALLBACK_MS = 2000;

type DecodedAudio = { duration: number; waveform: number[] };

let activeStopper: (() => void) | null = null;
let playingCount = 0;
let decodeQueue: Promise<void> = Promise.resolve();

// Um decode por vez e nunca durante reproducao: varios players na conversa
// disputando rede e CPU com o audio tocado causavam travadas no iOS.
function enqueueDecode(
  task: () => Promise<void>,
  signal: AbortSignal,
): Promise<void> {
  const run = async (): Promise<void> => {
    while (playingCount > 0 && !signal.aborted) {
      await new Promise((resolve) => setTimeout(resolve, DECODE_RETRY_MS));
    }
    if (!signal.aborted) await task();
  };
  decodeQueue = decodeQueue.then(run, run);
  return decodeQueue;
}

function stopActiveAudio(exceptStopper?: () => void): void {
  if (activeStopper && activeStopper !== exceptStopper) {
    activeStopper();
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

// OfflineAudioContext so decodifica: nao ha saida de som, o que evita o bug do
// WebKit com Web Audio em rota Bluetooth/CarPlay. O som sai do <audio>. A
// duracao decodificada e a real, o <audio> pode estimar diferente no Safari.
async function decodeAudio(bytes: ArrayBuffer): Promise<AudioBuffer> {
  const Ctor =
    window.OfflineAudioContext ||
    (
      window as typeof window & {
        webkitOfflineAudioContext?: typeof OfflineAudioContext;
      }
    ).webkitOfflineAudioContext;
  const ctx = new Ctor(1, 1, 44100);
  return ctx.decodeAudioData(bytes);
}

export function NativeAudioPlayer({
  audioUrl,
  externalId,
  onPlay,
  textFallback,
  translation,
  time,
  onExport,
  fluid,
  onUnsupported,
}: AudioPlayerProps & { onUnsupported?: () => void }) {
  const t = useTranslations("app.chat");
  const tErrors = useTranslations("app.errors");
  const [state, setState] = useState<PlayerState>("ready");
  const [elementDuration, setElementDuration] = useState(0);
  const [decoded, setDecoded] = useState<DecodedAudio | null>(null);
  const [applied, setApplied] = useState<DecodedAudio | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [showErrorHint, setShowErrorHint] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playFiredRef = useRef(false);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isCountedPlayingRef = useRef(false);
  const duration = applied?.duration || elementDuration;
  const waveform = applied?.waveform ?? [];
  const durationRef = useRef(0);
  durationRef.current = duration;

  const paintProgress = useCallback((seconds: number): void => {
    const total = durationRef.current;
    const fraction = total > 0 ? Math.min(1, seconds / total) : 0;
    waveRef.current?.style.setProperty("--p", String(fraction));
  }, []);

  const interruptPlayback = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const syncDuration = useCallback((): void => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setElementDuration(audio.duration);
    }
  }, []);

  useEffect(() => {
    setState("ready");
    setIsReady(false);
    setElementDuration(0);
    setDecoded(null);
    setApplied(null);
    setProgress(0);
    syncDuration();
  }, [audioUrl, syncDuration]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // Carrega assim que o player aparece, para o clique tocar direto. O iOS
  // ignora preload sem gesto, entao o load() explicito e o timeout evitam o
  // botao ficar desabilitado para sempre.
  useEffect(() => {
    if (!isVisible) return;
    audioRef.current?.load();
    const timer = setTimeout(() => setIsReady(true), READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [isVisible, audioUrl]);

  const markPlaying = useCallback((isOn: boolean): void => {
    if (isOn === isCountedPlayingRef.current) return;
    isCountedPlayingRef.current = isOn;
    playingCount += isOn ? 1 : -1;
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const controller = new AbortController();
    const decode = async (): Promise<void> => {
      try {
        const res = await fetch(audioUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const buffer = await decodeAudio(await res.arrayBuffer());
        if (controller.signal.aborted || buffer.length === 0) return;
        setDecoded({
          duration: buffer.duration,
          waveform: buildWaveform(buffer.getChannelData(0), WAVEFORM_BARS),
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[NativeAudioPlayer] decode failed", err);
      }
    };
    void enqueueDecode(decode, controller.signal);
    return () => controller.abort();
  }, [audioUrl, isVisible]);

  useEffect(() => {
    if (decoded && state !== "playing") setApplied(decoded);
  }, [decoded, state]);

  useEffect(() => {
    if (state === "playing") return;
    paintProgress(progress);
  }, [state, progress, duration, paintProgress]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      markPlaying(false);
      audio?.pause();
      if (activeStopper === interruptPlayback) {
        activeStopper = null;
      }
    };
  }, [interruptPlayback, markPlaying]);

  const handleError = useCallback((): void => {
    const code = audioRef.current?.error?.code;
    console.error("[NativeAudioPlayer] media error", code);
    setState("error");
    if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) onUnsupported?.();
  }, [onUnsupported]);

  const handlePause = useCallback((): void => {
    markPlaying(false);
    const audio = audioRef.current;
    if (!audio || audio.ended) return;
    setProgress(audio.currentTime);
    setState("paused");
  }, [markPlaying]);

  const handleEnded = useCallback((): void => {
    markPlaying(false);
    if (activeStopper === interruptPlayback) {
      activeStopper = null;
    }
    setProgress(0);
    setState("ready");
  }, [interruptPlayback, markPlaying]);

  useEffect(() => {
    if (state !== "playing") return;
    let frame = 0;
    const tick = (): void => {
      const audio = audioRef.current;
      if (audio) paintProgress(audio.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state, paintProgress]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (state === "error") {
      setShowErrorHint(true);
      return;
    }
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    if (!playFiredRef.current && externalId) {
      playFiredRef.current = true;
      onPlay?.(externalId);
    }

    stopActiveAudio(interruptPlayback);
    activeStopper = interruptPlayback;
    audio.play().catch((err: unknown) => {
      console.error("[NativeAudioPlayer] playback", err);
      setState("error");
    });
  }, [state, externalId, onPlay, interruptPlayback]);

  const handleSeek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      const clamped = Math.max(0, Math.min(seconds, duration));
      if (audio) audio.currentTime = clamped;
      setProgress(clamped);
    },
    [duration],
  );

  const isError = state === "error";
  const showElapsed = state === "playing" || state === "paused";
  const displayTime = showElapsed ? progress : duration;

  return (
    <div
      ref={rootRef}
      className={`flex flex-col gap-1 py-1 ${fluid ? "w-full" : "w-[260px] md:w-[320px]"}`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload={isVisible ? "auto" : "none"}
        onLoadedMetadata={syncDuration}
        onDurationChange={syncDuration}
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onSeeked={(e) => setProgress(e.currentTarget.currentTime)}
        onCanPlay={() => setIsReady(true)}
        onLoadedData={() => setIsReady(true)}
        onPlaying={() => {
          markPlaying(true);
          setState("playing");
        }}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
      />
      <div
        className={`flex items-center gap-3${isError ? " text-destructive" : ""}`}
      >
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={handlePlayPause}
          aria-label={state === "playing" ? t("pause") : t("play")}
          disabled={!isReady && !isError}
          className="shrink-0 rounded-full p-1 transition-colors active:bg-foreground/10 disabled:opacity-60"
        >
          <span className="flex h-7 w-7 items-center justify-center">
            {!isReady && !isError ? (
              <Spinner className="border-current" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7 fill-current"
              >
                <path
                  d={
                    state === "playing"
                      ? "M6 5h4v14H6zM14 5h4v14h-4z"
                      : "M8 5v14l11-7z"
                  }
                />
              </svg>
            )}
          </span>
        </button>

        <div
          ref={waveRef}
          className="flex-1 relative h-6 min-w-0"
          style={{ "--p": 0 } as CSSProperties}
        >
          {[0.3, 0.85].map((opacity) => (
            <div
              key={opacity}
              className="absolute inset-0 flex items-center gap-[2px] pointer-events-none"
              style={
                opacity === 0.85
                  ? { clipPath: "inset(0 calc((1 - var(--p)) * 100%) 0 0)" }
                  : undefined
              }
            >
              {(waveform.length > 0
                ? waveform
                : new Array(WAVEFORM_BARS).fill(WAVEFORM_IDLE_HEIGHT)
              ).map((height, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-current transition-[height] duration-300"
                  style={{
                    height: `${Math.max(3, height * 22)}px`,
                    opacity,
                  }}
                />
              ))}
            </div>
          ))}
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.01}
            value={progress}
            disabled={!isReady || isError || duration === 0}
            onChange={(e) => handleSeek(Number(e.target.value))}
            aria-label={t("audio_position_aria")}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
          />
          {duration > 0 && (
            <div
              className="absolute top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow pointer-events-none"
              style={{ left: "calc(var(--p) * 100%)" }}
            />
          )}
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

      <div className="flex items-center gap-3">
        <div className="w-9 shrink-0" aria-hidden="true" />
        <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
          <span
            className="select-none text-[10.5px] opacity-60 tabular-nums"
            onDoubleClick={() =>
              window.open(audioUrl, "_blank", "noopener,noreferrer")
            }
          >
            {formatTime(displayTime)}
          </span>
          {time && (
            <span
              className="select-none text-[10.5px] opacity-55 whitespace-nowrap"
              onDoubleClick={onExport}
              onContextMenu={onExport}
            >
              {time}
            </span>
          )}
        </div>
        <div className="w-9 shrink-0" aria-hidden="true" />
      </div>

      {isError && textFallback && (
        <p className="mt-1 min-w-0 whitespace-pre-line leading-[1.5] break-words opacity-80">
          {textFallback}
        </p>
      )}
      {isError && showErrorHint && (
        <p className="mt-0.5 text-[11px] text-destructive">
          {tErrors("audio_load_failed")}
        </p>
      )}
      {translation && !isError && (
        <>
          <div className="mt-1 h-px bg-foreground/10" />
          <button
            type="button"
            onClick={() => setShowTranslation((prev) => !prev)}
            aria-expanded={showTranslation}
            className="mt-0 flex w-full items-center justify-between gap-2 rounded-b-lg px-1 py-2.5 text-[13px] text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.03] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <span>{t("translation_label")}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200${showTranslation ? " rotate-180 text-foreground/70" : ""}`}
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-[280ms] ease-out ${showTranslation ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="min-w-0 overflow-hidden">
              <p
                className={`whitespace-pre-line break-words px-1 pb-3.5 pt-0.5 text-[14px] leading-[1.55] text-muted-foreground transition-all duration-200 ${showTranslation ? "translate-y-0 opacity-100 delay-[60ms]" : "-translate-y-1 opacity-0"}`}
              >
                {translation}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
