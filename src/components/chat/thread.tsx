"use client";

import { ArrowDown } from "lucide-react";
import {
  Fragment,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { shouldShowDateSeparator } from "@/src/lib/datetime-utils";
import { useScrollToBottom } from "@/src/hooks/use-scroll-to-bottom";
import { useVisualViewportOffset } from "@/src/hooks/use-visual-viewport-offset";
import { Composer, type ComposerHandle } from "./composer";
import { DateSeparator } from "./date-separator";
import { MessageBubble } from "./message-bubble";
import { TypingIndicatorBubble } from "./typing-indicator";
import type { FormattedMessageButton, Message } from "./types";

const FAR_FROM_BOTTOM_PX = 400;

function msgKey(m: Message): string {
  return m.externalId ?? m.id;
}

type ChatThreadProps = {
  messages: Message[];
  onSend?: (text: string) => void | Promise<void>;
  onSendFile?: (file: File) => void | Promise<void>;
  onRetry?: (externalId: string) => void;
  onAudioPlay?: (externalId: string) => void;
  onButtonClick?: (button: FormattedMessageButton) => void;
  composerDisabled?: boolean;
  composerDisabledReason?: string;
  isWaitingForResponse?: boolean;
  isTyping?: boolean;
  showComposer?: boolean;
  onLoadOlder?: () => void | Promise<void>;
  hasMoreOlder?: boolean;
  isLoadingOlder?: boolean;
};

export const ChatThread = forwardRef<ComposerHandle, ChatThreadProps>(
  function ChatThread(
    {
      messages,
      onSend,
      onSendFile,
      onRetry,
      onAudioPlay,
      onButtonClick,
      composerDisabled,
      composerDisabledReason,
      isWaitingForResponse,
      isTyping,
      showComposer = true,
      onLoadOlder,
      hasMoreOlder,
      isLoadingOlder,
    },
    ref,
  ) {
    const { containerRef, endRef, isAtBottom, scrollToBottom } =
      useScrollToBottom();
    const vvOffset = useVisualViewportOffset((offset) => {
      if (offset > 0) scrollToBottom("instant");
    });
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [isFarFromBottom, setIsFarFromBottom] = useState(false);
    const [composerHeight, setComposerHeight] = useState(0);
    const [mounted, setMounted] = useState(false);
    const composerWrapperRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const hasMountedRef = useRef(false);
    const lastMessage = messages[messages.length - 1];
    const prevLastIdRef = useRef<string | undefined>(
      lastMessage ? msgKey(lastMessage) : undefined,
    );
    const seenIdsRef = useRef<Set<string>>(new Set());
    const scrollPreserveRef = useRef<{
      scrollHeight: number;
      scrollTop: number;
    } | null>(null);
    const pendingOlderLoadRef = useRef(false);
    const prevFirstIdRef = useRef<string | undefined>(
      messages[0] ? msgKey(messages[0]) : undefined,
    );

    const firstId = messages[0] ? msgKey(messages[0]) : undefined;
    if (
      pendingOlderLoadRef.current &&
      firstId !== undefined &&
      firstId !== prevFirstIdRef.current
    ) {
      messages.forEach((message) => seenIdsRef.current.add(msgKey(message)));
    }

    useEffect(() => setMounted(true), []);

    useLayoutEffect(() => {
      const el = composerWrapperRef.current;
      if (!el || !showComposer) return;
      setComposerHeight(el.getBoundingClientRect().height);
      const observer = new ResizeObserver((entries) => {
        setComposerHeight(entries[0]?.contentRect.height ?? 0);
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [showComposer]);

    useEffect(() => {
      if (isAtBottom) scrollToBottom("instant");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [composerHeight]);

    useEffect(() => {
      if (isTyping && isAtBottom) scrollToBottom("smooth");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTyping]);

    useEffect(() => {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      function handleImageLoad(event: Event) {
        const img = event.target;
        if (!(img instanceof HTMLImageElement) || !containerEl) return;
        const containerTop = containerEl.getBoundingClientRect().top;
        const imgRect = img.getBoundingClientRect();
        if (imgRect.top < containerTop) {
          containerEl.scrollTop += imgRect.height;
        }
      }
      containerEl.addEventListener("load", handleImageLoad, true);
      return () =>
        containerEl.removeEventListener("load", handleImageLoad, true);
    }, [containerRef]);

    useEffect(() => {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      function handleScroll(el: HTMLDivElement) {
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        setIsFarFromBottom(distance > FAR_FROM_BOTTOM_PX);
      }
      const onScroll = () => handleScroll(containerEl);
      onScroll();
      containerEl.addEventListener("scroll", onScroll, { passive: true });
      return () => containerEl.removeEventListener("scroll", onScroll);
    }, [containerRef]);

    useEffect(() => {
      const tail = messages[messages.length - 1];
      const lastId = tail ? msgKey(tail) : undefined;
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        prevLastIdRef.current = lastId;
        scrollToBottom("instant");
        return;
      }
      const arrived = lastId !== undefined && lastId !== prevLastIdRef.current;
      prevLastIdRef.current = lastId;
      if (!arrived) return;
      if (tail?.from === "user") {
        scrollToBottom("smooth");
        setHasNewMessage(false);
        return;
      }
      if (isAtBottom) {
        scrollToBottom("smooth");
      } else {
        setHasNewMessage(true);
      }
    }, [messages, isAtBottom, scrollToBottom]);

    useEffect(() => {
      if (isAtBottom) setHasNewMessage(false);
    }, [isAtBottom]);

    useEffect(() => {
      messages.forEach((message) => seenIdsRef.current.add(msgKey(message)));
    });

    useEffect(() => {
      const containerEl = containerRef.current;
      const topEl = topRef.current;
      if (!containerEl || !topEl || !onLoadOlder) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          if (!hasMoreOlder || isLoadingOlder) return;
          scrollPreserveRef.current = {
            scrollHeight: containerEl.scrollHeight,
            scrollTop: containerEl.scrollTop,
          };
          pendingOlderLoadRef.current = true;
          void onLoadOlder();
        },
        { root: containerEl },
      );
      observer.observe(topEl);
      return () => observer.disconnect();
    }, [onLoadOlder, hasMoreOlder, isLoadingOlder, containerRef]);

    useLayoutEffect(() => {
      const firstId = messages[0] ? msgKey(messages[0]) : undefined;
      const isPrependEvent =
        pendingOlderLoadRef.current &&
        firstId !== undefined &&
        firstId !== prevFirstIdRef.current;
      prevFirstIdRef.current = firstId;
      if (!isPrependEvent) return;
      pendingOlderLoadRef.current = false;
      const preserved = scrollPreserveRef.current;
      const containerEl = containerRef.current;
      if (!preserved || !containerEl) return;
      const delta = containerEl.scrollHeight - preserved.scrollHeight;
      containerEl.scrollTop = preserved.scrollTop + delta;
      scrollPreserveRef.current = null;
    }, [messages, containerRef]);

    function handleJumpToBottom() {
      scrollToBottom("smooth");
      setHasNewMessage(false);
    }

    return (
      <div className="flex h-full min-h-0 flex-col bg-[#F5F5F5] dark:bg-black">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/images/wa-background.svg')] bg-repeat opacity-[0.06] dark:opacity-[0.05] dark:invert" />
          <div
            ref={containerRef}
            className="relative z-10 flex h-full flex-col gap-1.5 overflow-y-auto p-4"
            style={{
              overflowAnchor: "none",
              ...(showComposer ? { paddingBottom: composerHeight + 16 } : {}),
            }}
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              <div ref={topRef} />
              {messages.map((message, index) => {
                const showDateSeparator =
                  mounted &&
                  shouldShowDateSeparator(
                    message.date,
                    messages[index - 1]?.date,
                  );
                return (
                  <Fragment key={msgKey(message)}>
                    {showDateSeparator && message.date && (
                      <DateSeparator date={message.date} />
                    )}
                    <MessageBubble
                      message={message}
                      isNew={
                        hasMountedRef.current &&
                        !seenIdsRef.current.has(msgKey(message))
                      }
                      onRetry={onRetry}
                      onAudioPlay={onAudioPlay}
                      onButtonClick={onButtonClick}
                    />
                  </Fragment>
                );
              })}
              {isTyping && <TypingIndicatorBubble />}
            </div>
            <div ref={endRef} />
          </div>
          {isLoadingOlder && (
            <div className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-lg">
              <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-primary-foreground" />
              Carregando...
            </div>
          )}
          {(isFarFromBottom || hasNewMessage) && (
            <button
              type="button"
              onClick={handleJumpToBottom}
              style={{ bottom: composerHeight + vvOffset + 16 }}
              aria-label="Ir para o final"
              className="absolute left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-black text-white shadow-lg dark:bg-white dark:text-black"
            >
              <ArrowDown className="h-4 w-4" />
              {hasNewMessage && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
              )}
            </button>
          )}
          {showComposer && onSend && (
            <div
              ref={composerWrapperRef}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 cz-margin-vv"
            >
              <Composer
                ref={ref}
                onSend={onSend}
                onSendFile={onSendFile}
                disabled={composerDisabled}
                disabledReason={composerDisabledReason}
                isWaitingForResponse={isWaitingForResponse}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);
