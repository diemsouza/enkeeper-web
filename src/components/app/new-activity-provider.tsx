"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Level } from "@/src/lib/prisma";
import { NewActivityModal, type NewActivityStep } from "./new-activity-modal";
import { useProfileLevel } from "./profile-level-provider";

type NewActivityOpenOptions = { step?: NewActivityStep; prefill?: string };

type NewActivityContextValue = {
  openNewActivity: (options?: NewActivityOpenOptions) => void;
};

const NewActivityContext = createContext<NewActivityContextValue | null>(null);

export function useNewActivity(): NewActivityContextValue {
  const ctx = useContext(NewActivityContext);
  if (!ctx) throw new Error("useNewActivity fora do NewActivityProvider");
  return ctx;
}

// A criacao de atividade acontece so na modal; o chat recebe o resultado
// (geracao, "Pronto", primeira pergunta) pelo realtime.
export function NewActivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { level, setLevel } = useProfileLevel();
  const [open, setOpen] = useState(false);
  const [initialStep, setInitialStep] = useState<NewActivityStep>("main");
  const [prefill, setPrefill] = useState("");

  const openNewActivity = useCallback((options?: NewActivityOpenOptions) => {
    setInitialStep(options?.step ?? "main");
    setPrefill(options?.prefill ?? "");
    setOpen(true);
  }, []);

  // A criacao grava o nivel escolhido no perfil (new-activity-service).
  function handleCreated(createdLevel: Level): void {
    setLevel(createdLevel);
    setOpen(false);
    if (pathname !== "/app") {
      router.push("/app");
      return;
    }
    router.refresh();
  }

  const value = useMemo(() => ({ openNewActivity }), [openNewActivity]);

  return (
    <NewActivityContext.Provider value={value}>
      {children}
      <NewActivityModal
        open={open}
        onOpenChange={setOpen}
        initialStep={initialStep}
        initialText={prefill}
        initialLevel={level ?? "basic"}
        onCreated={handleCreated}
      />
    </NewActivityContext.Provider>
  );
}
