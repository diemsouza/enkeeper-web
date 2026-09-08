"use client";

import { useRef, useState } from "react";
import { cn } from "@/src/lib/utils";

const SCROLL_SPEED_PX_PER_SEC = 28;
const RESET_TRANSITION = "transform 300ms ease";

export function MarqueeLabel({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [animating, setAnimating] = useState(false);
  const [style, setStyle] = useState<{ transform: string; transition: string }>({
    transform: "translateX(0)",
    transition: RESET_TRANSITION,
  });

  function handleMouseEnter(): void {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;
    const overflow = text.scrollWidth - container.clientWidth;
    if (overflow <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnimating(true);
    setStyle({
      transform: `translateX(-${overflow}px)`,
      transition: `transform ${overflow / SCROLL_SPEED_PX_PER_SEC}s linear`,
    });
  }

  function handleMouseLeave(): void {
    setAnimating(false);
    setStyle({ transform: "translateX(0)", transition: RESET_TRANSITION });
  }

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("block min-w-0 overflow-hidden", className)}
    >
      <span
        ref={textRef}
        className={cn(
          "will-change-transform",
          animating ? "inline-block whitespace-nowrap" : "block truncate",
        )}
        style={style}
      >
        {label}
      </span>
    </span>
  );
}
