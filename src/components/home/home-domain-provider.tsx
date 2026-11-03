"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { DomainId } from "@/src/lib/constants";

type HomeDomainContextValue = {
  selectedDomain: DomainId | null;
  selectDomain: (domain: DomainId) => void;
};

const HomeDomainContext = createContext<HomeDomainContextValue | null>(null);

// Opcional: fora da home (termos, privacidade) os CTAs levam para /app puro.
export function useHomeDomain(): HomeDomainContextValue | null {
  return useContext(HomeDomainContext);
}

// So guarda a aba que o usuario tocou; o padrao do simulador nao conta.
export function HomeDomainProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedDomain, setSelectedDomain] = useState<DomainId | null>(null);
  const value = useMemo(
    () => ({ selectedDomain, selectDomain: setSelectedDomain }),
    [selectedDomain],
  );
  return (
    <HomeDomainContext.Provider value={value}>
      {children}
    </HomeDomainContext.Provider>
  );
}
