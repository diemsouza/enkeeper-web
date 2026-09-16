"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { DOMAINS, type DomainId } from "@/src/lib/constants";

type DomainSelectorProps = {
  active: DomainId;
  onChange: (id: DomainId) => void;
};

const SCROLL_EDGE_TOLERANCE_PX = 1;
const SCROLL_STEP_PX = 160;

export function DomainSelector({ active, onChange }: DomainSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateEdges = () => {
      setCanScrollLeft(el.scrollLeft > SCROLL_EDGE_TOLERANCE_PX);
      setCanScrollRight(
        el.scrollLeft + el.clientWidth <
          el.scrollWidth - SCROLL_EDGE_TOLERANCE_PX,
      );
    };

    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, []);

  return (
    <div className="relative w-full px-7">
      <div
        ref={scrollRef}
        className="flex w-full flex-nowrap gap-6 overflow-x-auto scrollbar-hide sm:justify-center"
      >
        {DOMAINS.map((domain) => (
          <button
            key={domain.id}
            type="button"
            onClick={() => onChange(domain.id)}
            className={cn(
              "shrink-0 whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
              domain.id === active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {domain.label}
          </button>
        ))}
      </div>

      {canScrollLeft && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() =>
            scrollRef.current?.scrollBy({
              left: -SCROLL_STEP_PX,
              behavior: "smooth",
            })
          }
          aria-label="Rolar para a esquerda"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}
      {canScrollRight && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() =>
            scrollRef.current?.scrollBy({
              left: SCROLL_STEP_PX,
              behavior: "smooth",
            })
          }
          aria-label="Rolar para a direita"
          className="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </Button>
      )}
    </div>
  );
}
