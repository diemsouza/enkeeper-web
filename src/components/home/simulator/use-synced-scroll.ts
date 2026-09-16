"use client";

import { useRef } from "react";

export function useSyncedScroll() {
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  function syncFrom(source: "primary" | "secondary") {
    return () => {
      if (syncingRef.current) return;
      const src = source === "primary" ? primaryRef.current : secondaryRef.current;
      const dst = source === "primary" ? secondaryRef.current : primaryRef.current;
      if (!src || !dst) return;

      const srcMax = src.scrollHeight - src.clientHeight;
      const ratio = srcMax > 0 ? src.scrollTop / srcMax : 0;
      const dstMax = dst.scrollHeight - dst.clientHeight;

      syncingRef.current = true;
      dst.scrollTop = ratio * dstMax;
      requestAnimationFrame(() => {
        syncingRef.current = false;
      });
    };
  }

  return {
    primaryRef,
    secondaryRef,
    onPrimaryScroll: syncFrom("primary"),
    onSecondaryScroll: syncFrom("secondary"),
  };
}
