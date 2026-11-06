"use client";

import { useRouter } from "next/navigation";
import { ulid } from "ulid";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isPracticePillActive,
  type PracticeActions,
  type PracticePillState,
} from "@/src/core/practice-pill";
import { getJson, postJson } from "@/src/lib/api-client";
import {
  INTENSIVE_UNTIL_MIN,
  REPLY_WAIT_TIMEOUT_MS,
} from "@/src/lib/constants";
import { markSentInSession } from "@/src/lib/session-sent-messages";

type PracticeSender = (text: string) => Promise<void>;

type PracticePillContextValue = {
  isVisible: boolean;
  isActive: boolean;
  practiceActions: PracticeActions | null;
  hasContinueFailed: boolean;
  continuePractice: () => Promise<void>;
  finishTurn: () => Promise<void>;
  markRated: (rating: boolean) => void;
  practice: () => Promise<void>;
  sendCommand: (text: string) => Promise<void>;
  refresh: () => Promise<void>;
  registerSender: (sender: PracticeSender | null) => void;
};

const PracticePillContext = createContext<PracticePillContextValue | null>(
  null,
);

export function usePracticePill(): PracticePillContextValue {
  const ctx = useContext(PracticePillContext);
  if (!ctx) throw new Error("usePracticePill fora do PracticePillProvider");
  return ctx;
}

export function PracticePillProvider({
  initialState,
  children,
}: {
  initialState: PracticePillState;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [now, setNow] = useState(() => Date.now());
  const [isContinuing, setIsContinuing] = useState(false);
  const [hasContinueFailed, setHasContinueFailed] = useState(false);
  const senderRef = useRef<PracticeSender | null>(null);
  const isContinuingRef = useRef(false);

  const stopContinuing = useCallback(() => {
    isContinuingRef.current = false;
    setIsContinuing(false);
  }, []);

  useEffect(() => {
    setNow(Date.now());
    if (!state.intensiveUntil) return;
    const remaining = new Date(state.intensiveUntil).getTime() - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(timer);
  }, [state.intensiveUntil]);

  useEffect(() => {
    if (state.practiceActions) return;
    stopContinuing();
    setHasContinueFailed(false);
  }, [state.practiceActions, stopContinuing]);

  useEffect(() => {
    if (!isContinuing) return;
    const timer = setTimeout(stopContinuing, REPLY_WAIT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isContinuing, stopContinuing]);

  const refresh = useCallback(async () => {
    const { ok, body } = await getJson<PracticePillState>(
      "/api/app/practice-state",
    );
    if (ok) setState(body);
  }, []);

  // typing:stop pode chegar antes da nova mensagem: soltar o Continuar antes
  // do estado novo mostraria de novo o bloco da pergunta anterior.
  const finishTurn = useCallback(async () => {
    await refresh();
    stopContinuing();
  }, [refresh, stopContinuing]);

  useEffect(() => {
    const onVisible = (): void => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const registerSender = useCallback((sender: PracticeSender | null) => {
    senderRef.current = sender;
  }, []);

  // No /app o comando sai pelo chat (bolha, "digitando", vez ativa); fora
  // dele, vai direto para a API e abre o /app.
  const sendCommand = useCallback(
    async (text: string) => {
      if (senderRef.current) {
        await senderRef.current(text);
        return;
      }
      // Fora do chat ao vivo: o externalId entra no registro da aba para a
      // resposta (ex: mensagem de comando) executar quando o chat montar.
      const externalId = ulid();
      markSentInSession(externalId);
      await postJson("/api/app/messages", { text, externalId });
      router.push("/app");
    },
    [router],
  );

  const practice = useCallback(async () => {
    const until = new Date(Date.now() + INTENSIVE_UNTIL_MIN * 60_000);
    setState((prev) => ({ ...prev, intensiveUntil: until.toISOString() }));
    await sendCommand("/praticar");
  }, [sendCommand]);

  const continuePractice = useCallback(async () => {
    if (isContinuingRef.current) return;
    isContinuingRef.current = true;
    setIsContinuing(true);
    setHasContinueFailed(false);
    const { ok } = await postJson("/api/app/practice/continue", {});
    if (ok) return;
    stopContinuing();
    setHasContinueFailed(true);
  }, [stopContinuing]);

  const markRated = useCallback((rating: boolean) => {
    setState((prev) =>
      prev.practiceActions
        ? { ...prev, practiceActions: { ...prev.practiceActions, rating } }
        : prev,
    );
  }, []);

  const value = useMemo(
    () => ({
      isVisible: state.isVisible,
      isActive: !isContinuing && isPracticePillActive(state, now),
      practiceActions: isContinuing ? null : state.practiceActions,
      hasContinueFailed,
      continuePractice,
      finishTurn,
      markRated,
      practice,
      sendCommand,
      refresh,
      registerSender,
    }),
    [
      state,
      now,
      isContinuing,
      hasContinueFailed,
      continuePractice,
      finishTurn,
      markRated,
      practice,
      sendCommand,
      refresh,
      registerSender,
    ],
  );

  return (
    <PracticePillContext.Provider value={value}>
      {children}
    </PracticePillContext.Provider>
  );
}
