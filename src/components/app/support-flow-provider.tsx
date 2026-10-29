"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SupportModal, type SupportReplyChannel } from "./support-modal";

type SupportFlowContextValue = {
  openSupport: () => void;
};

const SupportFlowContext = createContext<SupportFlowContextValue | null>(null);

export function useSupportFlow(): SupportFlowContextValue {
  const ctx = useContext(SupportFlowContext);
  if (!ctx) throw new Error("useSupportFlow fora do SupportFlowProvider");
  return ctx;
}

// Suporte fica fora do chat: o pedido vai so para a equipe e o historico da
// pratica nao recebe nada.
export function SupportFlowProvider({
  replyChannel,
  children,
}: {
  replyChannel: SupportReplyChannel;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openSupport = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openSupport }), [openSupport]);

  return (
    <SupportFlowContext.Provider value={value}>
      {children}
      <SupportModal
        open={open}
        onOpenChange={setOpen}
        replyChannel={replyChannel}
      />
    </SupportFlowContext.Provider>
  );
}
