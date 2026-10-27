"use client";

import { ArrowDown } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { cn } from "@/src/lib/utils";
import { Spinner } from "@/src/components/ui/spinner";
import { isAnyAudioPlaying } from "./native-audio-player";
import { Composer, type ComposerHandle } from "./composer";
import { DateSeparator } from "./date-separator";
import { MessageBubble } from "./message-bubble";
import { PendingReviewBanner } from "./pending-review-banner";
import { TypingIndicatorBubble } from "./typing-indicator";
import type { FormattedMessageButton, Message } from "./types";

const RECENT_INTERACTION_MS = 3000;
const JUMP_BUTTON_PX = 32;
const TAIL_SEEN_RATIO = 0.6;
const INTERACTION_EVENTS = ["touchstart", "touchmove", "wheel", "pointerdown"];

function msgKey(m: Message): string {
  return m.externalId ?? m.id;
}

function canAutoScroll(lastInteractionAt: number): boolean {
  return (
    !isAnyAudioPlaying() &&
    Date.now() - lastInteractionAt > RECENT_INTERACTION_MS
  );
}

// Mensagem "vista" quando a maior parte dela aparece entre o topo do chat e o
// composer; bolha mais alta que a tela conta pela fração da área visível.
function isTailMostlyVisible(
  containerEl: HTMLElement,
  composerHeight: number,
): boolean {
  const bubbles = containerEl.querySelectorAll("[data-message-bubble]");
  const tail = bubbles[bubbles.length - 1];
  if (!tail) return true;
  const containerRect = containerEl.getBoundingClientRect();
  const visibleBottom = containerRect.bottom - composerHeight;
  const rect = tail.getBoundingClientRect();
  const visible =
    Math.min(rect.bottom, visibleBottom) - Math.max(rect.top, containerRect.top);
  const visibleArea = visibleBottom - containerRect.top;
  return visible >= TAIL_SEEN_RATIO * Math.min(rect.height, visibleArea);
}

type ChatThreadProps = {
  messages: Message[];
  onSend?: (text: string) => void | Promise<void>;
  onSendFile?: (file: File) => void | Promise<void>;
  onSendAudio?: (recording: Blob) => void | Promise<void>;
  onRetry?: (externalId: string) => void;
  onAudioPlay?: (externalId: string) => void;
  onButtonClick?: (button: FormattedMessageButton, messageId: string) => void;
  composerDisabled?: boolean;
  composerDisabledReason?: string;
  isWaitingForResponse?: boolean;
  isTyping?: boolean;
  showComposer?: boolean;
  onLoadOlder?: () => void | Promise<void>;
  hasMoreOlder?: boolean;
  isLoadingOlder?: boolean;
  showPendingReviewBanner?: boolean;
  pendingReviewCount?: number;
  onPracticeClick?: () => void;
};

export const ChatThread = forwardRef<ComposerHandle, ChatThreadProps>(
  function ChatThread(
    {
      messages,
      onSend,
      onSendFile,
      onSendAudio,
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
      showPendingReviewBanner,
      pendingReviewCount = 0,
      onPracticeClick,
    },
    ref,
  ) {
    const t = useTranslations("app.chat");
    const {
      containerRef,
      contentRef,
      endRef,
      isAtBottom,
      isFarFromBottom,
      scrollToBottom,
      scrollToBottomWhenSettled,
      notifySettleActivity,
      isFollowPausedRef,
    } = useScrollToBottom();
    const vvOffset = useVisualViewportOffset((offset) => {
      if (offset > 0) scrollToBottom("instant");
    });
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [composerHeight, setComposerHeight] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [isThreadReady, setIsThreadReady] = useState(false);
    const composerWrapperRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const hasMountedRef = useRef(false);
    const lastMessage = messages[messages.length - 1];
    const prevLastIdRef = useRef<string | undefined>(
      lastMessage ? msgKey(lastMessage) : undefined,
    );
    const seenIdsRef = useRef<Set<string>>(new Set());
    const isFirstBotOfTurnRef = useRef(true);
    const lastInteractionAtRef = useRef(0);
    const scrollPreserveRef = useRef<{ scrollHeight: number } | null>(null);
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
        notifySettleActivity();
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [showComposer, notifySettleActivity]);

    useEffect(() => {
      if (isAtBottom) scrollToBottom("instant");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [composerHeight]);

    useEffect(() => {
      if (!isTyping || isFollowPausedRef.current) return;
      if (canAutoScroll(lastInteractionAtRef.current)) scrollToBottom("smooth");
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
      function markInteraction() {
        lastInteractionAtRef.current = Date.now();
      }
      INTERACTION_EVENTS.forEach((type) =>
        containerEl.addEventListener(type, markInteraction, { passive: true }),
      );
      return () =>
        INTERACTION_EVENTS.forEach((type) =>
          containerEl.removeEventListener(type, markInteraction),
        );
    }, [containerRef]);

    // Layout effect: precisa decidir antes do ResizeObserver do hook, que
    // grudaria no fim assim que a mensagem nova muda a altura do conteudo.
    useLayoutEffect(() => {
      const tail = messages[messages.length - 1];
      const lastId = tail ? msgKey(tail) : undefined;
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        prevLastIdRef.current = lastId;
        scrollToBottomWhenSettled(() => setIsThreadReady(true));
        return;
      }
      const arrived = lastId !== undefined && lastId !== prevLastIdRef.current;
      prevLastIdRef.current = lastId;
      if (!arrived) return;
      if (tail?.from === "user") {
        // O toque que iniciou a vez (opção, praticar, enviar) não é leitura:
        // só rolagem feita depois dele segura o acompanhamento.
        lastInteractionAtRef.current = 0;
        isFollowPausedRef.current = false;
        isFirstBotOfTurnRef.current = true;
        scrollToBottom("smooth");
        setHasNewMessage(false);
        return;
      }
      const isFirstBotOfTurn = isFirstBotOfTurnRef.current;
      isFirstBotOfTurnRef.current = false;
      if (
        isFirstBotOfTurn &&
        !isFollowPausedRef.current &&
        canAutoScroll(lastInteractionAtRef.current)
      ) {
        scrollToBottom("smooth");
        return;
      }
      isFollowPausedRef.current = true;
      const containerEl = containerRef.current;
      if (containerEl && !isTailMostlyVisible(containerEl, composerHeight)) {
        setHasNewMessage(true);
      }
    }, [
      messages,
      scrollToBottom,
      scrollToBottomWhenSettled,
      isFollowPausedRef,
      containerRef,
      composerHeight,
    ]);

    useEffect(() => {
      const containerEl = containerRef.current;
      if (!hasNewMessage || !containerEl) return;
      function clearIfSeen() {
        if (containerEl && isTailMostlyVisible(containerEl, composerHeight)) {
          setHasNewMessage(false);
        }
      }
      containerEl.addEventListener("scroll", clearIfSeen, { passive: true });
      return () => containerEl.removeEventListener("scroll", clearIfSeen);
    }, [hasNewMessage, composerHeight, containerRef]);

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
      containerEl.scrollTop = containerEl.scrollTop + delta;
      scrollPreserveRef.current = null;
    }, [messages, containerRef]);

    function handleJumpToBottom() {
      scrollToBottom("smooth");
      setHasNewMessage(false);
    }

    return (
      <div className="flex h-full min-h-0 flex-col bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/images/wa-background.svg')] bg-repeat opacity-[0.06] dark:opacity-[0.05] dark:invert" /> */}
          <div
            ref={containerRef}
            className="relative z-10 flex h-full flex-col gap-1.5 overflow-y-auto p-4"
            style={{
              overflowAnchor: "none",
              ...(showComposer
                ? { paddingBottom: composerHeight + 16 + JUMP_BUTTON_PX }
                : {}),
            }}
          >
            <div
              ref={contentRef}
              className={cn(
                "mx-auto flex w-full max-w-3xl flex-col gap-3 transition-opacity duration-150",
                isThreadReady ? "opacity-100" : "opacity-0",
              )}
            >
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
          {!isThreadReady && (
            <Spinner
              centerHorizontal
              className="absolute inset-x-0 top-3 z-20"
            />
          )}
          {isLoadingOlder && (
            <div className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-lg">
              <Spinner size="xs" className="border-primary-foreground" />
              {t("loading")}
            </div>
          )}
          {(isFarFromBottom || hasNewMessage) && (
            <button
              type="button"
              onClick={handleJumpToBottom}
              style={{ bottom: composerHeight + vvOffset + 8 }}
              aria-label={t("scroll_to_bottom_aria")}
              className="absolute left-1/2 z-20 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-background/[95%] text-foreground shadow-sm backdrop-blur-sx backdrop-saturate-150"
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
              {showPendingReviewBanner && onPracticeClick && (
                <div className="px-3 pt-2">
                  <PendingReviewBanner
                    count={pendingReviewCount}
                    onPractice={onPracticeClick}
                  />
                </div>
              )}
              <Composer
                ref={ref}
                onSend={onSend}
                onSendFile={onSendFile}
                onSendAudio={onSendAudio}
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
