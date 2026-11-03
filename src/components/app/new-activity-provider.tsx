"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Level } from "@/src/lib/prisma";
import type { DomainId } from "@/src/lib/constants";
import {
  DOMAIN_URL_PARAM,
  parseDomainParam,
  stripDomainParam,
} from "@/src/core/domain-param";
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
  const searchParams = useSearchParams();
  const { level, setLevel } = useProfileLevel();
  const [open, setOpen] = useState(false);
  const [initialStep, setInitialStep] = useState<NewActivityStep>("main");
  const [prefill, setPrefill] = useState("");
  const [presetDomain, setPresetDomain] = useState<DomainId | null>(null);
  const urlDomain = parseDomainParam(searchParams.get(DOMAIN_URL_PARAM));

  // Guardado em estado para sobreviver a navegacao interna antes da criacao.
  useEffect(() => {
    if (urlDomain) setPresetDomain(urlDomain);
  }, [urlDomain]);

  const openNewActivity = useCallback((options?: NewActivityOpenOptions) => {
    setInitialStep(options?.step ?? "main");
    setPrefill(options?.prefill ?? "");
    setOpen(true);
  }, []);

  // Domain da URL e de uso unico: a primeira criacao descarta. O
  // replaceState do Next sincroniza useSearchParams sem nova navegacao.
  function discardPresetDomain(): void {
    setPresetDomain(null);
    if (!searchParams.has(DOMAIN_URL_PARAM)) return;
    const search = stripDomainParam(window.location.search);
    window.history.replaceState(null, "", `${pathname}${search}`);
  }

  // A criacao grava o nivel escolhido no perfil (new-activity-service).
  function handleCreated(createdLevel: Level): void {
    setLevel(createdLevel);
    setOpen(false);
    discardPresetDomain();
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
        initialDomain={presetDomain}
        onCreated={handleCreated}
      />
    </NewActivityContext.Provider>
  );
}
