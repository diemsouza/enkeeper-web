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
        "mb-[var(--composer-button-offset)] h-composer shrink-0 touch-none select-none rounded-full transition-[width,padding] [-webkit-touch-callout:none] [-webkit-user-select:none]",
        isHold ? "w-auto px-4 text-[15px] font-medium" : "w-composer",
      )}
    >
      {isHold ? (
        t("voice.release_to_send")
      ) : role === "mic" ? (
        <Mic className="h-composer-icon w-composer-icon" />
      ) : (
        <ArrowUp className="h-composer-icon w-composer-icon" />
      )}
    </Button>
  );
}
