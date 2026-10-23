"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WAVEFORM_BARS } from "@/src/components/chat/waveform-bars";
import { setRecordingAudioSession } from "@/src/lib/audio-unlock";
import {
  canResumeAudioContext,
  unlockSharedAudioContext,
} from "@/src/lib/shared-audio-context";
import {
  pickRecorderMimeType,
  preloadVoiceRemux,
  recorderBitrate,
} from "@/src/lib/voice-recording";
import {
  VOICE_MAX_SEC,
  VOICE_MIN_MS,
  VOICE_WARN_SEC,
} from "@/src/lib/constants";

export type VoiceRecorderStatus =
  "idle" | "requesting" | "recording" | "denied";
export type VoiceCaptureError = "not_found" | "in_use" | "generic";

type LevelMeter = { analyser: AnalyserNode; release: () => void };

type UseVoiceRecorderOptions = {
  onRecorded: (recording: Blob) => void;
  onCaptureError: (error: VoiceCaptureError) => void;
};

type UseVoiceRecorderResult = {
  status: VoiceRecorderStatus;
  elapsedMs: number;
  levels: number[];
  isWarning: boolean;
  start: () => void;
  finish: () => void;
  cancel: () => void;
  dismissDenied: () => void;
  resumeAudio: () => void;
};

const TICK_MS = 100;
const LEVEL_TICK_MS = 75;
const LEVEL_GAIN = 5;
// Rede de seguranca: se o MediaRecorder nunca disparar "stop", a UI nao pode
// ficar presa no estado gravando.
const STOP_FALLBACK_MS = 1500;
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const silentLevels = (): number[] => new Array<number>(WAVEFORM_BARS).fill(0);

function classifyCaptureError(err: unknown): VoiceCaptureError | "denied" {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "not_found";
  }
  if (name === "NotReadableError" || name === "AbortError") return "in_use";
  return "generic";
}

// O ganho zero ligado ao destino mantem o grafo processando no Safari, que
// nao atualiza um AnalyserNode solto, sem tocar o microfone no alto-falante.
function createLevelMeter(
  ctx: AudioContext,
  stream: MediaStream,
): LevelMeter | null {
  try {
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    const sink = ctx.createGain();
    sink.gain.value = 0;
    source.connect(analyser);
    analyser.connect(sink);
    sink.connect(ctx.destination);
    const release = (): void => {
      source.disconnect();
      analyser.disconnect();
      sink.disconnect();
    };
    return { analyser, release };
  } catch (err) {
    console.error("[useVoiceRecorder] level meter:", err);
    return null;
  }
}

function readLevel(
  analyser: AnalyserNode,
  buffer: Float32Array<ArrayBuffer>,
): number {
  analyser.getFloatTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.min(1, Math.sqrt(sum / buffer.length) * LEVEL_GAIN);
}

export function useVoiceRecorder({
  onRecorded,
  onCaptureError,
}: UseVoiceRecorderOptions): UseVoiceRecorderResult {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>(silentLevels);

  const statusRef = useRef<VoiceRecorderStatus>("idle");
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const meterRef = useRef<LevelMeter | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stoppedAtRef = useRef(0);
  const shouldSendRef = useRef(true);
  const isMountedRef = useRef(true);
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef({ onRecorded, onCaptureError });
  callbacksRef.current = { onRecorded, onCaptureError };

  const updateStatus = useCallback((next: VoiceRecorderStatus): void => {
    statusRef.current = next;
    if (isMountedRef.current) setStatus(next);
  }, []);

  const releaseCapture = useCallback((): void => {
    timersRef.current.forEach(clearInterval);
    timersRef.current = [];
    meterRef.current?.release();
    meterRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecordingAudioSession(false);
  }, []);

  const deliverRecording = useCallback((): void => {
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = null;
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    releaseCapture();
    const durationMs = stoppedAtRef.current - startedAtRef.current;
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
    chunksRef.current = [];
    updateStatus("idle");
    if (!shouldSendRef.current || durationMs < VOICE_MIN_MS) return;
    if (blob.size === 0) return;
    callbacksRef.current.onRecorded(blob);
  }, [releaseCapture, updateStatus]);

  const stopRecording = useCallback(
    (shouldSend: boolean): void => {
      // Soltou antes da captura comecar: nada foi gravado. O then() do
      // getUserMedia ve o status mudado e fecha as tracks.
      if (statusRef.current === "requesting") {
        updateStatus("idle");
        return;
      }
      const recorder = recorderRef.current;
      if (!recorder || stoppedAtRef.current > 0) return;
      shouldSendRef.current = shouldSend;
      stoppedAtRef.current = performance.now();
      if (recorder.state === "inactive") {
        deliverRecording();
        return;
      }
      fallbackRef.current = setTimeout(deliverRecording, STOP_FALLBACK_MS);
      try {
        recorder.stop();
      } catch (err) {
        console.error("[useVoiceRecorder] stop:", err);
        deliverRecording();
      }
    },
    [deliverRecording, updateStatus],
  );

  const finish = useCallback(() => stopRecording(true), [stopRecording]);
  const cancel = useCallback(() => stopRecording(false), [stopRecording]);

  const startTimers = useCallback((): void => {
    const buffer = new Float32Array(1024);
    const clock = setInterval(() => {
      const elapsed = performance.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= VOICE_MAX_SEC * 1000) stopRecording(true);
    }, TICK_MS);
    const meter = setInterval(() => {
      const analyser = meterRef.current?.analyser;
      if (!analyser) return;
      const level = readLevel(analyser, buffer);
      setLevels((prev) => [...prev.slice(1), level]);
    }, LEVEL_TICK_MS);
    timersRef.current = [clock, meter];
  }, [stopRecording]);

  const beginRecording = useCallback(
    (stream: MediaStream, ctx: AudioContext | null, mimeType: string): void => {
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: recorderBitrate(mimeType),
      });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      // iOS para o MediaRecorder sozinho ao bloquear a tela ou trocar de app.
      recorder.onstop = () => {
        if (stoppedAtRef.current === 0) {
          stoppedAtRef.current = performance.now();
        }
        deliverRecording();
      };
      recorder.onerror = () => stopRecording(true);
      stream.getTracks().forEach((track) => {
        track.onended = () => stopRecording(true);
      });
      // No toque o pointerdown nao conta como gesto e o resume() do clique pode
      // nao ter destravado; com a captura ativa o navegador costuma liberar.
      if (ctx && canResumeAudioContext(ctx.state)) void ctx.resume();
      meterRef.current = ctx ? createLevelMeter(ctx, stream) : null;
      recorderRef.current = recorder;
      stoppedAtRef.current = 0;
      shouldSendRef.current = true;
      recorder.start();
      preloadVoiceRemux(mimeType);
      startedAtRef.current = performance.now();
      setElapsedMs(0);
      setLevels(silentLevels());
      updateStatus("recording");
      startTimers();
    },
    [deliverRecording, stopRecording, startTimers, updateStatus],
  );

  const handleCaptureFailure = useCallback(
    (err: unknown): void => {
      releaseCapture();
      const kind = classifyCaptureError(err);
      if (kind === "denied") {
        updateStatus("denied");
        return;
      }
      console.error("[useVoiceRecorder] capture:", err);
      updateStatus("idle");
      callbacksRef.current.onCaptureError(kind);
    },
    [releaseCapture, updateStatus],
  );

  // iOS: resume do AudioContext e getUserMedia precisam sair sincronos dentro
  // do toque, antes de qualquer await, senao o gesto se perde.
  const start = useCallback((): void => {
    if (statusRef.current !== "idle") return;
    const mimeType = pickRecorderMimeType();
    if (!mimeType) return;
    updateStatus("requesting");
    setRecordingAudioSession(true);
    const ctx = unlockSharedAudioContext();
    navigator.mediaDevices
      .getUserMedia({ audio: AUDIO_CONSTRAINTS })
      .then((stream) => {
        if (!isMountedRef.current || statusRef.current !== "requesting") {
          stream.getTracks().forEach((track) => track.stop());
          setRecordingAudioSession(false);
          return;
        }
        beginRecording(stream, ctx, mimeType);
      })
      .catch(handleCaptureFailure);
  }, [beginRecording, handleCaptureFailure, updateStatus]);

  const dismissDenied = useCallback(() => updateStatus("idle"), [updateStatus]);
  const resumeAudio = useCallback((): void => {
    unlockSharedAudioContext();
  }, []);

  useEffect(() => {
    const handleVisibility = (): void => {
      if (document.visibilityState === "hidden") stopRecording(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [stopRecording]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopRecording(false);
      releaseCapture();
    };
  }, [stopRecording, releaseCapture]);

  return {
    status,
    elapsedMs,
    levels,
    isWarning: elapsedMs >= VOICE_WARN_SEC * 1000,
    start,
    finish,
    cancel,
    dismissDenied,
    resumeAudio,
  };
}
