"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
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

type PlayerState = "loading" | "ready" | "playing" | "paused" | "error";

const WAVEFORM_BARS = 40;
const LOAD_TIMEOUT_MS = 20000;
const CAN_PLAY_WAIT_MS = 1500;

let activeStopper: (() => void) | null = null;

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
// WebKit com Web Audio em rota Bluetooth/CarPlay. O som sai do <audio>.
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

// iOS ignora preload e pode nunca disparar canplaythrough sem gesto, entao a
// espera e limitada para nao deixar o player em loading.
function waitForCanPlay(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      clearTimeout(timer);
      audio.removeEventListener("canplaythrough", done);
      resolve();
    };
    const timer = setTimeout(done, CAN_PLAY_WAIT_MS);
    audio.addEventListener("canplaythrough", done);
    if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) done();
  });
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
}: AudioPlayerProps) {
  const t = useTranslations("app.chat");
  const tErrors = useTranslations("app.errors");
  const [state, setState] = useState<PlayerState>("loading");
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showErrorHint, setShowErrorHint] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playFiredRef = useRef(false);
  const stateRef = useRef<PlayerState>("loading");
  stateRef.current = state;

  const [waveform, setWaveform] = useState<number[]>([]);

  const fail = useCallback((reason: string, err?: unknown): void => {
    console.error(`[NativeAudioPlayer] ${reason}`, err);
    setState("error");
  }, []);

  const interruptPlayback = useCallback(() => {
    audioRef.current?.pause();
    if (activeStopper === interruptPlayback) {
      activeStopper = null;
    }
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    let objectUrl: string | null = null;

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, LOAD_TIMEOUT_MS);

    const onPlaying = (): void => setState("playing");
    const onPause = (): void => {
      if (audio.ended) return;
      setProgress(audio.currentTime);
      setState("paused");
    };
    const onEnded = (): void => {
      if (activeStopper === interruptPlayback) {
        activeStopper = null;
      }
      audio.currentTime = 0;
      setProgress(0);
      setState("ready");
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    (async () => {
      try {
        const res = await fetch(audioUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
        const bytes = await res.arrayBuffer();
        objectUrl = URL.createObjectURL(
          new Blob([bytes], { type: res.headers.get("content-type") ?? "" }),
        );
        const decoded = await decodeAudio(bytes);
        if (cancelled) return;

        if (decoded.length === 0) throw new Error("empty decode");

        audio.preload = "auto";
        audio.src = objectUrl;
        audio.load();
        await waitForCanPlay(audio);
        if (cancelled) return;
        setDuration(decoded.duration);
        setWaveform(buildWaveform(decoded.getChannelData(0), WAVEFORM_BARS));
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
      audio.pause();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (activeStopper === interruptPlayback) {
        activeStopper = null;
      }
      audioRef.current = null;
    };
  }, [audioUrl, fail, interruptPlayback]);

  useEffect(() => {
    if (state !== "playing") return;
    let frame = 0;
    const tick = (): void => {
      const audio = audioRef.current;
      if (audio && audio.currentTime > 0) {
        setProgress(Math.min(audio.currentTime, duration));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state, duration]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (stateRef.current === "error") {
      setShowErrorHint(true);
      return;
    }
    if (!audio || stateRef.current === "loading") return;

    if (stateRef.current === "playing") {
      audio.pause();
      return;
    }

    if (!playFiredRef.current && externalId) {
      playFiredRef.current = true;
      onPlay?.(externalId);
    }

    stopActiveAudio(interruptPlayback);
    activeStopper = interruptPlayback;
    audio.play().catch((err: unknown) => fail("playback", err));
  }, [externalId, onPlay, interruptPlayback, fail]);

  const handleSeek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      const clamped = Math.max(0, Math.min(seconds, duration));
      if (audio) audio.currentTime = clamped;
      setProgress(clamped);
    },
    [duration],
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
    <div
      className={`flex flex-col gap-1 py-1 ${fluid ? "w-full" : "w-[260px] md:w-[320px]"}`}
    >
      <div
        className={`flex items-center gap-3${isError ? " text-destructive" : ""}`}
      >
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={handlePlayPause}
          disabled={isLoading}
          aria-label={state === "playing" ? t("pause") : t("play")}
          className="shrink-0 rounded-full p-1 transition-colors active:bg-foreground/10 disabled:opacity-60"
        >
          {isLoading ? (
            <Spinner className="border-current" />
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

        <div className="flex-1 relative h-6 min-w-0">
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
            aria-label={t("audio_position_aria")}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
          />
          {duration > 0 && (
            <div
              className="absolute top-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow pointer-events-none"
              style={{ left: `${thumbLeft}%` }}
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
          <span className="text-[10.5px] opacity-60 tabular-nums">
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
      {translation && !isLoading && !isError && (
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
