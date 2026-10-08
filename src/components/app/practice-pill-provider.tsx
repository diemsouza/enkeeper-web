"use client";

import { useRouter } from "next/navigation";
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
  type PracticePillState,
} from "@/src/core/practice-pill";
import { getJson, postJson } from "@/src/lib/api-client";
import { INTENSIVE_UNTIL_MIN } from "@/src/lib/constants";

type PracticeSender = (text: string) => Promise<void>;

type PracticePillContextValue = {
  isVisible: boolean;
  isActive: boolean;
  practice: () => Promise<void>;
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
  const senderRef = useRef<PracticeSender | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (!state.intensiveUntil) return;
    const remaining = new Date(state.intensiveUntil).getTime() - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(timer);
  }, [state.intensiveUntil]);

  const refresh = useCallback(async () => {
    const { ok, body } = await getJson<PracticePillState>(
      "/api/app/practice-state",
    );
    if (ok) setState(body);
  }, []);

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

  const practice = useCallback(async () => {
    const until = new Date(Date.now() + INTENSIVE_UNTIL_MIN * 60_000);
    setState((prev) => ({ ...prev, intensiveUntil: until.toISOString() }));
    if (senderRef.current) {
      await senderRef.current("praticar");
      return;
    }
    await postJson("/api/app/messages", { text: "praticar" });
    router.push("/app");
  }, [router]);

  const value = useMemo(
    () => ({
      isVisible: state.isVisible,
      isActive: isPracticePillActive(state, now),
      practice,
      refresh,
      registerSender,
    }),
    [state, now, practice, refresh, registerSender],
  );

  return (
    <PracticePillContext.Provider value={value}>
      {children}
    </PracticePillContext.Provider>
  );
}
