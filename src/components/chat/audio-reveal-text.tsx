"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";

type AudioRevealTextProps = {
  label: string;
  text: string;
  isUserBubble?: boolean;
};

// Bloco que abre e fecha abaixo do player ("Ver tradução", "Ver transcrição").
// Na bolha do usuário o cinza some sobre o azul: usa a cor do texto da bolha.
export function AudioRevealText({
  label,
  text,
  isUserBubble,
}: AudioRevealTextProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div
        className={cn(
          "mt-1 h-px",
          isUserBubble ? "bg-primary-foreground/20" : "bg-foreground/10",
        )}
      />
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={cn(
          "mt-0 flex w-full items-center justify-between gap-2 rounded-b-lg px-1 py-2.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          isUserBubble
            ? "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
        )}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            isUserBubble
              ? "text-primary-foreground/80"
              : "text-muted-foreground",
            isOpen && "rotate-180",
            isOpen && !isUserBubble && "text-foreground/70",
          )}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-[280ms] ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-w-0 overflow-hidden">
          <p
            className={cn(
              "whitespace-pre-line break-words px-1 pb-3.5 pt-0.5 text-[14px] leading-[1.55] transition-all duration-200",
              isUserBubble
                ? "text-primary-foreground/90"
                : "text-muted-foreground",
              isOpen
                ? "translate-y-0 opacity-100 delay-[60ms]"
                : "-translate-y-1 opacity-0",
            )}
          >
            {text}
          </p>
        </div>
      </div>
    </>
  );
}
