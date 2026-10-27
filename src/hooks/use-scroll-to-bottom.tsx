import { useCallback, useEffect, useRef, useState } from "react";

const SETTLE_QUIET_MS = 150;
const SETTLE_MAX_WAIT_MS = 2500;
const SCROLL_UP_TOLERANCE_PX = 2;

// nearBottomPx: distancia do fim em que a ultima mensagem ainda aparece
// inteira (espaco do digitando e do botao abaixo dela).
export function useScrollToBottom({ nearBottomPx }: { nearBottomPx: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isPinned, setIsPinned] = useState(true);
  const isAtBottomRef = useRef(true);
  // Depois de rolar ate o fim, crescimento do conteudo continua grudado no
  // fim ate chegar mensagem que nao rola ou o usuario rolar para cima.
  const isPinnedRef = useRef(true);
  const isUserScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const settleCallbackRef = useRef<(() => void) | null>(null);
  const settleQuietTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const settleMaxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const setPinned = useCallback((pinned: boolean) => {
    isPinnedRef.current = pinned;
    setIsPinned(pinned);
  }, []);

  const scrollContainerToBottom = useCallback((behavior: ScrollBehavior) => {
    const containerEl = containerRef.current;
    containerEl?.scrollTo({ top: containerEl.scrollHeight, behavior });
  }, []);

  const snapToBottom = useCallback(() => {
    scrollContainerToBottom("instant");
  }, [scrollContainerToBottom]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      setPinned(true);
      scrollContainerToBottom(behavior);
    },
    [setPinned, scrollContainerToBottom],
  );

  const getDistanceFromBottom = useCallback((): number => {
    const containerEl = containerRef.current;
    if (!containerEl) return 0;
    return (
      containerEl.scrollHeight - containerEl.scrollTop - containerEl.clientHeight
    );
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
      const atBottom = getDistanceFromBottom() <= nearBottomPx;
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
      if (atBottom) isUserScrolledUpRef.current = false;
    }

    // Rolagem programatica so desce; subir longe do fim e gesto do usuario.
    function handleScroll() {
      if (!containerEl) return;
      const scrollTop = containerEl.scrollTop;
      const movedUp =
        scrollTop < lastScrollTopRef.current - SCROLL_UP_TOLERANCE_PX;
      lastScrollTopRef.current = scrollTop;
      measure();
      if (movedUp && !isAtBottomRef.current && !settleCallbackRef.current) {
        isUserScrolledUpRef.current = true;
        setPinned(false);
      }
    }

    function handleContentResize() {
      if (notifySettleActivity()) return;
      if (isPinnedRef.current) {
        snapToBottom();
        return;
      }
      measure();
    }

    measure();
    lastScrollTopRef.current = containerEl.scrollTop;
    containerEl.addEventListener("scroll", handleScroll, { passive: true });
    const resizeObserver = new ResizeObserver(handleContentResize);
    resizeObserver.observe(contentEl);

    return () => {
      containerEl.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [
    nearBottomPx,
    setPinned,
    snapToBottom,
    notifySettleActivity,
    getDistanceFromBottom,
  ]);

  useEffect(() => clearSettleTimers, [clearSettleTimers]);

  const isFollowing = useCallback(
    (): boolean =>
      !isUserScrolledUpRef.current &&
      (isPinnedRef.current || isAtBottomRef.current),
    [],
  );

  return {
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
  };
}
