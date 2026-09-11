import useSWR from "swr";
import { useRef, useEffect, useCallback } from "react";

type ScrollFlag = ScrollBehavior | false;

export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: isAtBottom = false, mutate: setIsAtBottom } = useSWR(
    "messages:is-at-bottom",
    null,
    { fallbackData: false }
  );

  const { data: scrollBehavior = false, mutate: setScrollBehavior } =
    useSWR<ScrollFlag>("messages:should-scroll", null, { fallbackData: false });

  useEffect(() => {
    if (scrollBehavior) {
      endRef.current?.scrollIntoView({ behavior: scrollBehavior });
      setScrollBehavior(false);
    }
  }, [setScrollBehavior, scrollBehavior]);

  useEffect(() => {
    const containerEl = containerRef.current;
    const endEl = endRef.current;
    if (!containerEl || !endEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsAtBottom(true);
        else setIsAtBottom(false);
      },
      { root: containerEl, rootMargin: "0px 0px 150px 0px" },
    );
    observer.observe(endEl);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = useCallback(
    (scrollBehavior: ScrollBehavior = "smooth") => {
      setScrollBehavior(scrollBehavior);
    },
    [setScrollBehavior]
  );

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
  };
}
