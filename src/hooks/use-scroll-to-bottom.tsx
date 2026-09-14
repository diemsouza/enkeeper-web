import { useCallback, useEffect, useRef, useState } from "react";

const NEAR_BOTTOM_PX = 150;
const FAR_FROM_BOTTOM_PX = 400;
const SETTLE_QUIET_MS = 150;
const SETTLE_MAX_WAIT_MS = 2500;

export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isFarFromBottom, setIsFarFromBottom] = useState(false);
  const isAtBottomRef = useRef(false);
  const settleCallbackRef = useRef<(() => void) | null>(null);
  const settleQuietTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const settleMaxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const snapToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "instant" });
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setIsFarFromBottom(false);
  }, []);

  const clearSettleTimers = useCallback(() => {
    if (settleQuietTimeoutRef.current) clearTimeout(settleQuietTimeoutRef.current);
    if (settleMaxTimeoutRef.current) clearTimeout(settleMaxTimeoutRef.current);
    settleQuietTimeoutRef.current = null;
    settleMaxTimeoutRef.current = null;
  }, []);

  const finishSettling = useCallback(() => {
    clearSettleTimers();
    const callback = settleCallbackRef.current;
    settleCallbackRef.current = null;
    snapToBottom();
    callback?.();
  }, [clearSettleTimers, snapToBottom]);

  const armQuietTimer = useCallback(() => {
    if (settleQuietTimeoutRef.current) clearTimeout(settleQuietTimeoutRef.current);
    settleQuietTimeoutRef.current = setTimeout(finishSettling, SETTLE_QUIET_MS);
  }, [finishSettling]);

  // Chamado por qualquer fonte de mudanca de layout durante o assentamento
  // inicial (resize do conteudo, altura do composer, viewport). Reacende o
  // timer de silencio e reposiciona; retorna true se ainda estava assentando
  // (o caller pode pular a propria logica de scroll nesse caso).
  const notifySettleActivity = useCallback((): boolean => {
    if (!settleCallbackRef.current) return false;
    snapToBottom();
    armQuietTimer();
    return true;
  }, [snapToBottom, armQuietTimer]);

  const scrollToBottomWhenSettled = useCallback(
    (onSettled: () => void) => {
      settleCallbackRef.current = onSettled;
      snapToBottom();
      clearSettleTimers();
      settleMaxTimeoutRef.current = setTimeout(finishSettling, SETTLE_MAX_WAIT_MS);

      const contentEl = contentRef.current;
      const pending: Promise<unknown>[] = [];
      if (typeof document !== "undefined" && "fonts" in document) {
        pending.push(document.fonts.ready);
      }
      contentEl?.querySelectorAll("img").forEach((img) => {
        if (!img.complete) {
          pending.push(
            new Promise((resolve) => {
              img.addEventListener("load", resolve, { once: true });
              img.addEventListener("error", resolve, { once: true });
            }),
          );
        }
      });

      if (pending.length > 0) {
        // So comeca a contar o silencio depois que fontes/imagens ja
        // pendentes no momento do mount resolverem - senao o timer de 150ms
        // pode vencer entre duas imagens carregando em rede lenta e revelar
        // a conversa antes da ultima terminar. O ResizeObserver continua
        // cobrindo qualquer outra mudanca (imagem nova, audio, reflow).
        Promise.all(pending).then(() => {
          if (settleCallbackRef.current === onSettled) armQuietTimer();
        });
      } else {
        armQuietTimer();
      }
    },
    [snapToBottom, clearSettleTimers, finishSettling, armQuietTimer],
  );

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
      if (notifySettleActivity()) return;
      const wasAtBottom = isAtBottomRef.current;
      if (wasAtBottom) {
        snapToBottom();
        return;
      }
      measure();
    }

    measure();
    containerEl.addEventListener("scroll", measure, { passive: true });
    const resizeObserver = new ResizeObserver(handleContentResize);
    resizeObserver.observe(contentEl);

    return () => {
      containerEl.removeEventListener("scroll", measure);
      resizeObserver.disconnect();
    };
  }, [snapToBottom, notifySettleActivity]);

  useEffect(() => clearSettleTimers, [clearSettleTimers]);

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
    scrollToBottomWhenSettled,
    notifySettleActivity,
  };
}
