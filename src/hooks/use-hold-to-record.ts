"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { VoiceRecorderStatus } from "@/src/hooks/use-voice-recorder";

const HOLD_THRESHOLD_MS = 300;
// O click que o navegador dispara depois do pointerup chega no mesmo botao,
// que no modo travado ja virou enviar.
const PRESS_CLICK_WINDOW_MS = 400;

type UseHoldToRecordOptions = {
  status: VoiceRecorderStatus;
  start: () => void;
  finish: () => void;
  resumeAudio: () => void;
};

type HoldButtonHandlers = {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => void;
  onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
};

type UseHoldToRecordResult = {
  isHolding: boolean;
  handlers: HoldButtonHandlers;
  shouldIgnoreClick: () => boolean;
};

type Press = { pointerId: number; canHold: boolean };

// O popup de permissao interrompe o gesto: so segura quem ja concedeu.
// Firefox recusa o nome "microphone"; ali vale a primeira gravacao da sessao.
function useMicPermissionGranted(status: VoiceRecorderStatus) {
  const isGrantedRef = useRef(false);

  useEffect(() => {
    let permission: PermissionStatus | null = null;
    const sync = (): void => {
      isGrantedRef.current = permission?.state === "granted";
    };
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((result) => {
        permission = result;
        sync();
        result.addEventListener("change", sync);
      })
      .catch(() => {
        // sem suporte: fica a marcacao pela gravacao bem-sucedida
      });
    return () => permission?.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (status === "recording") isGrantedRef.current = true;
  }, [status]);

  return isGrantedRef;
}

export function useHoldToRecord({
  status,
  start,
  finish,
  resumeAudio,
}: UseHoldToRecordOptions): UseHoldToRecordResult {
  const [isHolding, setIsHolding] = useState(false);
  const isGrantedRef = useMicPermissionGranted(status);
  const pressRef = useRef<Press | null>(null);
  const isHoldingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreClickUntilRef = useRef(0);

  const updateHolding = useCallback((next: boolean): void => {
    isHoldingRef.current = next;
    setIsHolding(next);
  }, []);

  const clearTimer = useCallback((): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const endPress = useCallback(
    (pointerId: number): void => {
      const press = pressRef.current;
      if (!press || press.pointerId !== pointerId) return;
      pressRef.current = null;
      clearTimer();
      ignoreClickUntilRef.current = performance.now() + PRESS_CLICK_WINDOW_MS;
      const wasHolding = isHoldingRef.current;
      updateHolding(false);
      if (wasHolding) finish();
    },
    [clearTimer, finish, updateHolding],
  );

  // getUserMedia sai sincrono no pointerdown (dentro de start).
  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>): void => {
      if (event.button !== 0 || pressRef.current || status !== "idle") return;
      if (event.pointerType === "mouse") event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      const press = {
        pointerId: event.pointerId,
        canHold: isGrantedRef.current,
      };
      pressRef.current = press;
      start();
      timerRef.current = setTimeout(() => {
        if (pressRef.current === press && press.canHold) updateHolding(true);
      }, HOLD_THRESHOLD_MS);
    },
    [isGrantedRef, start, status, updateHolding],
  );

  // No toque o pointerup e o gesto que libera o AudioContext.
  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>): void => {
      if (pressRef.current?.pointerId !== event.pointerId) return;
      resumeAudio();
      endPress(event.pointerId);
    },
    [endPress, resumeAudio],
  );

  const onPointerCancel = useCallback(
    (event: PointerEvent<HTMLButtonElement>): void => endPress(event.pointerId),
    [endPress],
  );

  const onContextMenu = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => event.preventDefault(),
    [],
  );

  // Gravacao encerrada por fora (limite de 30s, aba oculta, erro) tira do
  // modo segurar; o pointerup seguinte nao faz nada.
  useEffect(() => {
    if (
      status !== "requesting" &&
      status !== "recording" &&
      isHoldingRef.current
    ) {
      updateHolding(false);
    }
  }, [status, updateHolding]);

  useEffect(() => clearTimer, [clearTimer]);

  const shouldIgnoreClick = useCallback(
    (): boolean => performance.now() < ignoreClickUntilRef.current,
    [],
  );

  return {
    isHolding,
    shouldIgnoreClick,
    handlers: {
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onLostPointerCapture: onPointerCancel,
      onContextMenu,
    },
  };
}
