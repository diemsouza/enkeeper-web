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
import { Composer, type ComposerHandle } from "./composer";
import { DateSeparator } from "./date-separator";
import { MessageBubble } from "./message-bubble";
import { PendingReviewBanner } from "./pending-review-banner";
import { TYPING_SLOT_PX, TypingIndicatorSlot } from "./typing-indicator";
import type { FormattedMessageButton, Message } from "./types";

const JUMP_BUTTON_PX = 32;
const JUMP_BUTTON_GAP_PX = 8;
// Espaco abaixo da lista para o botao "ir para o final" nunca cobrir conteudo.
const JUMP_SPACE_PX = JUMP_BUTTON_GAP_PX + JUMP_BUTTON_PX + JUMP_BUTTON_GAP_PX;
// gap-3 entre a ultima mensagem e o slot do digitando.
const CONTENT_GAP_PX = 12;
// Ate essa distancia do fim a ultima mensagem aparece inteira.
const NEAR_BOTTOM_PX = JUMP_SPACE_PX + TYPING_SLOT_PX + CONTENT_GAP_PX;

function msgKey(m: Message): string {
  return m.externalId ?? m.id;
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
      isAtBottom,
      isPinned,
      isUserScrolledUpRef,
      isFollowing,
      getDistanceFromBottom,
      scrollToBottom,
      snapToBottom,
      setPinned,
      scrollToBottomWhenSettled,
      notifySettleActivity,
    } = useScrollToBottom({ nearBottomPx: NEAR_BOTTOM_PX });
    const vvOffset = useVisualViewportOffset();
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [composerHeight, setComposerHeight] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [isThreadReady, setIsThreadReady] = useState(false);
    const composerWrapperRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const hasMountedRef = useRef(false);
    const prevTailRef = useRef<Message | undefined>(
      messages[messages.length - 1],
    );
    const seenIdsRef = useRef<Set<string>>(new Set());
    // Chave unica de auto scroll (Product-Rules Secao 19, Rolagem do chat).
    const isAutoScrollOnRef = useRef(true);
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

    // Composer ou teclado mudam o padding inferior: quem acompanhava o fim
    // continua nele.
    useLayoutEffect(() => {
      if (isFollowing()) snapToBottom();
    }, [composerHeight, vvOffset, isFollowing, snapToBottom]);

    useEffect(() => {
      if (isAtBottom) setHasNewMessage(false);
    }, [isAtBottom]);

    // So imagem sem dimensoes (anterior a Media.metadata guardar o tamanho)
    // cresce ao carregar; acima da tela, compensa para o texto nao pular.
    useEffect(() => {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      function handleImageLoad(event: Event) {
        const img = event.target;
        if (!(img instanceof HTMLImageElement) || !containerEl) return;
        if (img.hasAttribute("width")) return;
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

    // Layout effect: precisa decidir antes do ResizeObserver do hook, que
    // grudaria no fim assim que a mensagem nova muda a altura do conteudo.
    useLayoutEffect(() => {
      const tail = messages[messages.length - 1];
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        prevTailRef.current = tail;
        scrollToBottomWhenSettled(() => setIsThreadReady(true));
        return;
      }
      const prevTail = prevTailRef.current;
      prevTailRef.current = tail;
      if (!tail || (prevTail && msgKey(prevTail) === msgKey(tail))) return;
      if (tail.from === "user") {
        isAutoScrollOnRef.current = true;
        isUserScrolledUpRef.current = false;
        setHasNewMessage(false);
        scrollToBottom("smooth");
        return;
      }
      const startsStudy = Boolean(tail.isStudy) && !prevTail?.isStudy;
      const shouldScroll = startsStudy || isAutoScrollOnRef.current;
      if (startsStudy) isAutoScrollOnRef.current = false;
      if (shouldScroll && !isUserScrolledUpRef.current) {
        scrollToBottom("smooth");
        return;
      }
      setPinned(false);
      if (getDistanceFromBottom() > NEAR_BOTTOM_PX) setHasNewMessage(true);
    }, [
      messages,
      scrollToBottom,
      scrollToBottomWhenSettled,
      setPinned,
      getDistanceFromBottom,
      isUserScrolledUpRef,
    ]);

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

    const bottomInset = showComposer ? composerHeight + vvOffset : 0;
    const showJumpButton = !isAtBottom && !isPinned;

    return (
      <div className="flex h-full min-h-0 flex-col bg-[#F5F5F7] dark:bg-[#1C1C1E]">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/images/wa-background.svg')] bg-repeat opacity-[0.06] dark:opacity-[0.05] dark:invert" /> */}
          <div
            ref={containerRef}
            className="relative z-10 flex h-full flex-col gap-1.5 overflow-y-auto p-4"
            style={{
              overflowAnchor: "none",
              paddingBottom: bottomInset + JUMP_SPACE_PX,
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
              <TypingIndicatorSlot isVisible={Boolean(isTyping)} />
            </div>
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
          {showJumpButton && (
            <button
              type="button"
              onClick={handleJumpToBottom}
              style={{ bottom: bottomInset + JUMP_BUTTON_GAP_PX }}
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
