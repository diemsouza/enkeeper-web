"use client";

import { useEffect } from "react";
import { Spinner } from "@/src/components/ui/spinner";
import { setUserId, track } from "@/src/lib/analytics";

type GoogleLoginDoneProps = {
  userId: string;
  event: "sign_up" | "login";
  redirectTo: string;
};

// O callback do Google é server-side: os eventos do GTM (sign_up/login) só
// podem sair do navegador, então esta tela dispara e segue para o destino.
export function GoogleLoginDone({
  userId,
  event,
  redirectTo,
}: GoogleLoginDoneProps) {
  useEffect(() => {
    setUserId(userId);
    track(event, { method: "google" });
    window.location.replace(redirectTo);
  }, [userId, event, redirectTo]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <Spinner size="lg" />
    </div>
  );
}
