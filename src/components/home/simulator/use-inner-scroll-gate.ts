"use client";

import { useEffect, useRef, useState } from "react";

const VISIBLE_FRACTION = 0.9;
const THRESHOLD_STEPS = 40;
const THRESHOLDS = Array.from(
  { length: THRESHOLD_STEPS + 1 },
  (_, i) => i / THRESHOLD_STEPS,
);

// No toque, a rolagem interna so liga com o simulador quase inteiro na tela
// (ou cobrindo quase toda a altura visivel, em telas menores que ele); antes
// disso o gesto rola a pagina. No mouse fica sempre ligada.
export function useInnerScrollGate<T extends HTMLElement>(): {
  targetRef: React.RefObject<T | null>;
  isScrollEnabled: boolean;
} {
  const targetRef = useRef<T>(null);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !window.matchMedia("(pointer: coarse)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const viewportHeight = entry.rootBounds?.height ?? window.innerHeight;
        setIsScrollEnabled(
          entry.intersectionRatio >= VISIBLE_FRACTION ||
            entry.intersectionRect.height >= viewportHeight * VISIBLE_FRACTION,
        );
      },
      { threshold: THRESHOLDS },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { targetRef, isScrollEnabled };
}
