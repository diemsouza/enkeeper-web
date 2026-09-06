import { useEffect, useRef, useState } from "react";

export function useVisualViewportOffset(
  onOffsetChange?: (offset: number) => void,
): number {
  const [offset, setOffset] = useState(0);
  const onOffsetChangeRef = useRef(onOffsetChange);
  onOffsetChangeRef.current = onOffsetChange;

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function handleViewportChange(): void {
      if (!vv) return;
      const next = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--cz-vv-offset", `${next}px`);
      setOffset((prev) => {
        if (prev !== next) onOffsetChangeRef.current?.(next);
        return next;
      });
    }

    handleViewportChange();
    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);

    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
      document.documentElement.style.setProperty("--cz-vv-offset", "0px");
    };
  }, []);

  return offset;
}
