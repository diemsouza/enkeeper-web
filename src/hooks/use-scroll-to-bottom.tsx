import { useCallback, useEffect, useRef, useState } from "react";

const NEAR_BOTTOM_PX = 150;
const FAR_FROM_BOTTOM_PX = 400;

export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isFarFromBottom, setIsFarFromBottom] = useState(false);

  useEffect(() => {
    const containerEl = containerRef.current;
    const contentEl = contentRef.current;
    if (!containerEl || !contentEl) return;

    function measure() {
      if (!containerEl) return;
      const distance =
        containerEl.scrollHeight - containerEl.scrollTop - containerEl.clientHeight;
      setIsAtBottom(distance <= NEAR_BOTTOM_PX);
      setIsFarFromBottom(distance > FAR_FROM_BOTTOM_PX);
    }

    measure();
    containerEl.addEventListener("scroll", measure, { passive: true });
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(contentEl);

    return () => {
      containerEl.removeEventListener("scroll", measure);
      resizeObserver.disconnect();
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    endRef.current?.scrollIntoView({ behavior });
  }, []);

  return {
    containerRef,
    contentRef,
    endRef,
    isAtBottom,
    isFarFromBottom,
    scrollToBottom,
  };
}
