import { useCallback, useEffect, useRef, useState } from "react";

const NEAR_BOTTOM_PX = 150;
const FAR_FROM_BOTTOM_PX = 400;

export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isFarFromBottom, setIsFarFromBottom] = useState(false);
  const isAtBottomRef = useRef(false);

  useEffect(() => {
    const containerEl = containerRef.current;
    const contentEl = contentRef.current;
    if (!containerEl || !contentEl) return;

    function measure() {
      if (!containerEl) return;
      const distance =
        containerEl.scrollHeight - containerEl.scrollTop - containerEl.clientHeight;
      const atBottom = distance <= NEAR_BOTTOM_PX;
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
      setIsFarFromBottom(distance > FAR_FROM_BOTTOM_PX);
    }

    function handleContentResize() {
      const wasAtBottom = isAtBottomRef.current;
      measure();
      if (wasAtBottom) endRef.current?.scrollIntoView({ behavior: "instant" });
    }

    measure();
    containerEl.addEventListener("scroll", measure, { passive: true });
    const resizeObserver = new ResizeObserver(handleContentResize);
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
