"use client";

import type { MouseEvent, PointerEvent } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

export type ComposerActionRole = "mic" | "send" | "locked" | "hold";

type PointerHandler = (event: PointerEvent<HTMLButtonElement>) => void;

type ComposerActionButtonProps = {
  role: ComposerActionRole;
  disabled: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onPointerDown: PointerHandler;
  onPointerUp: PointerHandler;
  onPointerCancel: PointerHandler;
  onLostPointerCapture: PointerHandler;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
};

const ARIA_KEYS: Record<ComposerActionRole, string> = {
  mic: "voice.record_aria",
  send: "send_aria",
  locked: "voice.send_aria",
  hold: "voice.release_to_send",
};

// Um elemento so em todos os papeis: no segurar para falar o dedo comeca no
// mic e solta no "Solte para enviar"; se o botao desmontasse no meio, o iOS
// deixaria de entregar o pointerup.
export function ComposerActionButton({
  role,
  ...props
}: ComposerActionButtonProps): React.JSX.Element {
  const t = useTranslations("app.chat");
  const isHold = role === "hold";
  return (
    <Button
      type="button"
      size="icon"
      {...props}
      aria-label={t(ARIA_KEYS[role])}
      className={cn(
        "relative h-9 shrink-0 touch-none select-none rounded-full transition-[width,padding] [-webkit-touch-callout:none] [-webkit-user-select:none] before:absolute before:-inset-1",
        isHold ? "w-auto px-4 text-sm font-medium" : "w-9",
      )}
    >
      {isHold ? (
        t("voice.release_to_send")
      ) : role === "mic" ? (
        <Mic className="h-4 w-4" />
      ) : (
        <ArrowUp className="h-4 w-4" />
      )}
    </Button>
  );
}
