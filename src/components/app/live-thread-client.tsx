"use client";

import { ulid } from "ulid";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatThread } from "@/src/components/chat/thread";
import type { ComposerHandle } from "@/src/components/chat/composer";
import { mapBroadcastRecord } from "@/src/components/chat/map-messages";
import type {
  FormattedMessageButton,
  Message,
  MessageStatus,
} from "@/src/components/chat/types";
import { resolveCommand } from "@/src/lib/commands";
import { getJson, postForm, postJson } from "@/src/lib/api-client";
import { useRealtimeMessages } from "@/src/hooks/use-realtime-messages";
import { useIsMobile } from "@/src/hooks/use-is-mobile";
import { setupAudioUnlock } from "@/src/lib/audio-unlock";
import { delay } from "@/src/lib/utils";

type MessagesResponse = { messages: Message[]; hasMore: boolean };

type OptimisticSelection = { buttonId: string; userExternalId: string };
type OptimisticSelections = Record<string, OptimisticSelection>;

// Trava do composer enquanto espera resposta (nao e o "digitando", que vem
// do servidor): cobre avaliacao + intervalo pos-feedback + geracao de imagem.
const REPLY_WAIT_TIMEOUT_MS = 45_000;
// Failsafe do "digitando": typing:start perdido ou canal caido. Mesmo limite
// do indicador nativo do WhatsApp.
const TYPING_TTL_MS = 25_000;
const MIN_LOADING_OLDER_MS = 400;

function nowTime(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function mediaTypeFromFile(file: File): "image" | "pdf" | "text" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  return "text";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sameMessage(a: Message, key: string): boolean {
  return a.id === key || a.externalId === key;
}

function isSameInteractive(
  a: Message["interactive"],
  b: Message["interactive"],
): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function mergeServerInteractive(prev: Message[], server: Message): Message[] {
  const idx = prev.findIndex((m) => m.id === server.id);
  if (
    idx === -1 ||
    isSameInteractive(prev[idx].interactive, server.interactive)
  ) {
    return prev;
  }
  const next = [...prev];
  next[idx] = { ...next[idx], interactive: server.interactive };
  return next;
}

// Servidor vence: a selecao local so vale enquanto a mensagem nao veio
// travada do servidor.
function applyOptimisticSelections(
  messages: Message[],
  selections: OptimisticSelections,
): Message[] {
  if (Object.keys(selections).length === 0) return messages;
  return messages.map((m) => {
    const selection = selections[m.id];
    if (!selection || !m.interactive || m.interactive.disabled) return m;
    return {
      ...m,
      interactive: {
        ...m.interactive,
        disabled: true,
        selectedId: selection.buttonId,
      },
    };
  });
}

function findOpenOptionMessageId(
  messages: Message[],
  buttonId: string,
): string | null {
  const target = [...messages]
    .reverse()
    .find(
      (m) =>
        m.interactive?.isOptionList &&
        !m.interactive.disabled &&
        m.interactive.buttons.some((b) => b.id === buttonId),
    );
  return target?.id ?? null;
}

export function LiveThreadClient({
  userId,
  currentActivityId,
  initialMessages,
  initialHasMoreOlder,
  needsAutoStart,
  pendingReviewCount = 0,
  showPendingReviewBanner = false,
}: {
  userId: string;
  currentActivityId: string | null;
  initialMessages: Message[];
  initialHasMoreOlder: boolean;
  needsAutoStart: boolean;
  pendingReviewCount?: number;
  showPendingReviewBanner?: boolean;
}) {
  const t = useTranslations("app.onboarding");
  const tChat = useTranslations("app.chat");
  const router = useRouter();
  const isMobile = useIsMobile();
  const fileLabels = {
    image: tChat("file_type_image"),
    pdf: tChat("file_type_pdf"),
    text: tChat("file_type_text"),
    generic: tChat("file_type_generic"),
  };
  const [messages, setMessages] = useState(initialMessages);
  const [optimisticSelections, setOptimisticSelections] =
    useState<OptimisticSelections>({});
  const [starting, setStarting] = useState(needsAutoStart);
  const [waitTimedOut, setWaitTimedOut] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasMoreOlder, setHasMoreOlder] = useState(initialHasMoreOlder);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [showPendingReview, setShowPendingReview] = useState(
    showPendingReviewBanner,
  );
  const autoStartTriggered = useRef(false);
  const composerRef = useRef<ComposerHandle>(null);
  const knownActivityIdRef = useRef(currentActivityId);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const pendingFilesRef = useRef<Map<string, File>>(new Map());

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = null;
    setIsTyping(false);
  }, []);

  const startTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, TYPING_TTL_MS);
    setIsTyping(true);
  }, [stopTyping]);

  const handleTyping = useCallback(
    (isActive: boolean) => (isActive ? startTyping() : stopTyping()),
    [startTyping, stopTyping],
  );

  useEffect(() => stopTyping, [stopTyping]);

  const clearSelectionByUserMessage = useCallback((externalId: string) => {
    setOptimisticSelections((prev) => {
      const entry = Object.entries(prev).find(
        ([, s]) => s.userExternalId === externalId,
      );
      if (!entry) return prev;
      const next = { ...prev };
      delete next[entry[0]];
      return next;
    });
  }, []);

  const setMessageStatus = useCallback(
    (externalId: string, status: MessageStatus) => {
      if (status === "sent") pendingFilesRef.current.delete(externalId);
      setMessages((prev) =>
        prev.map((m) => (m.externalId === externalId ? { ...m, status } : m)),
      );
    },
    [],
  );

  const refreshMessages = useCallback(async () => {
    const { ok, body } = await getJson<MessagesResponse>("/api/app/messages");
    if (!ok) return;

    setMessages((prev) => {
      const prevIds = new Set(prev.map((m) => m.id));
      const prevExternalIds = new Set(
        prev.filter((m) => m.externalId).map((m) => m.externalId as string),
      );
      let changed = false;

      const reconciled = prev.map((m) => {
        if (m.from === "bot" && m.interactive) {
          const server = body.messages.find((s) => s.id === m.id);
          if (server && !isSameInteractive(m.interactive, server.interactive)) {
            changed = true;
            return { ...m, interactive: server.interactive };
          }
        }
        if (m.type === "audio" && !m.translation) {
          const server = body.messages.find((s) => s.id === m.id);
          if (server?.translation) {
            changed = true;
            return { ...m, translation: server.translation };
          }
        }
        if (!m.status || m.status === "sent" || !m.externalId) return m;
        const server = body.messages.find((s) => s.externalId === m.externalId);
        if (!server) return m;
        changed = true;
        return { ...m, ...server, status: "sent" as const };
      });

      const toAppend = body.messages.filter(
        (s) =>
          !prevIds.has(s.id) &&
          !(s.externalId && prevExternalIds.has(s.externalId)),
      );
      if (toAppend.length === 0) return changed ? reconciled : prev;
      return [...reconciled, ...toAppend];
    });

    if (body.messages.length > 0) setStarting(false);
    const known = messagesRef.current;
    const hasNewBotMessage = body.messages.some(
      (s) =>
        s.from === "bot" &&
        !known.some(
          (m) =>
            m.id === s.id || (!!s.externalId && m.externalId === s.externalId),
        ),
    );
    if (hasNewBotMessage) stopTyping();
  }, [stopTyping]);

  const handleRealtimeEvent = (
    record: Record<string, unknown> | undefined,
  ): void => {
    if (!record) {
      void refreshMessages();
      return;
    }
    const mapped = mapBroadcastRecord(record, fileLabels);
    const key = mapped.externalId ?? mapped.id;

    if (mapped.from === "user") {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => sameMessage(m, key));
        if (idx !== -1) {
          pendingFilesRef.current.delete(key);
          const next = [...prev];
          next[idx] = { ...next[idx], ...mapped, status: "sent" };
          return next;
        }
        return [...prev, mapped];
      });
      // O servidor grava o estado da lista de opcoes antes de salvar a
      // mensagem do usuario: a partir daqui o refresh ja traz o estado final.
      const hasSelection = Object.values(optimisticSelections).some(
        (s) => s.userExternalId === key,
      );
      if (hasSelection) {
        void refreshMessages().then(() => clearSelectionByUserMessage(key));
      }
      return;
    }

    if (messagesRef.current.some((m) => sameMessage(m, key))) {
      setMessages((prev) => mergeServerInteractive(prev, mapped));
      return;
    }

    // Atividade nova e criada de forma assincrona (process-doc, onboarding):
    // o sidebar vem do server layout e so atualiza com refresh.
    const activityId =
      typeof record.activity_id === "string" ? record.activity_id : null;
    if (activityId && activityId !== knownActivityIdRef.current) {
      knownActivityIdRef.current = activityId;
      router.refresh();
    }

    stopTyping();
    setMessages((prev) =>
      prev.some((m) => sameMessage(m, key)) ? prev : [...prev, mapped],
    );
    setStarting(false);
    // Mensagem de audio de feedback chega via broadcast sem a traducao
    // (mapBroadcastRecord nao faz join com Question) - a rota /api/app/messages
    // ja tem, entao um refresh logo em seguida preenche via refreshMessages.
    if (mapped.type === "audio") void refreshMessages();
  };

  const loadOlderMessages = useCallback(async () => {
    if (!hasMoreOlder || isLoadingOlder || messages.length === 0) return;
    const startedAt = Date.now();
    setIsLoadingOlder(true);
    const { ok, body } = await getJson<MessagesResponse>(
      `/api/app/messages?before=${messages[0].id}`,
    );
    if (ok) {
      setMessages((prev) => [...body.messages, ...prev]);
      setHasMoreOlder(body.hasMore);
    }
    const wait = Math.max(MIN_LOADING_OLDER_MS - (Date.now() - startedAt), 0);
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    setIsLoadingOlder(false);
  }, [messages, hasMoreOlder, isLoadingOlder]);

  const triggerAutoStart = useCallback(() => {
    if (!needsAutoStart || autoStartTriggered.current) return;
    autoStartTriggered.current = true;
    void postJson("/api/app/conversation/start", {});
  }, [needsAutoStart]);

  const handleReconnect = useCallback(() => {
    void refreshMessages();
    const pending = messagesRef.current.find(
      (m) => m.from === "user" && m.status === "failed",
    );
    if (pending) void handleRetrySend(pending.externalId ?? pending.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshMessages]);

  useRealtimeMessages(
    userId,
    handleRealtimeEvent,
    handleReconnect,
    triggerAutoStart,
    handleTyping,
  );

  useEffect(() => {
    if (!needsAutoStart) return;
    // Rede lenta ou canal Realtime indisponível: garante que o onboarding
    // ainda dispara em vez de travar esperando o evento "SUBSCRIBED".
    const fallback = setTimeout(triggerAutoStart, 3000);
    return () => clearTimeout(fallback);
  }, [needsAutoStart, triggerAutoStart]);

  const lastMessage = messages[messages.length - 1];
  const lastKey = lastMessage?.externalId ?? lastMessage?.id;
  const isLastFromUser = lastMessage?.from === "user";
  const isSendPending = isLastFromUser && lastMessage?.status === "sending";
  const isWaitingForResponse =
    isLastFromUser && lastMessage?.status !== "failed" && !waitTimedOut;

  useEffect(() => {
    if (!isLastFromUser || lastMessage?.status === "failed") {
      setWaitTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setWaitTimedOut(true), REPLY_WAIT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isLastFromUser, lastKey, lastMessage?.status]);

  useEffect(() => {
    setupAudioUnlock();
  }, []);

  function selectOption(
    messageId: string,
    buttonId: string,
    userExternalId: string,
  ): void {
    setOptimisticSelections((prev) => ({
      ...prev,
      [messageId]: { buttonId, userExternalId },
    }));
  }

  async function handleSend(
    text: string,
    option?: { messageId: string; buttonId: string },
  ) {
    if (showPendingReview && resolveCommand(text.trim()) === "practice_now") {
      setShowPendingReview(false);
    }
    const externalId = ulid();
    setMessages((prev) => [
      ...prev,
      {
        id: externalId,
        externalId,
        from: "user",
        text,
        time: nowTime(),
        date: new Date().toISOString(),
        status: "sending",
        buttonId: option?.buttonId,
      },
    ]);
    if (option) selectOption(option.messageId, option.buttonId, externalId);
    const { ok } = await postJson("/api/app/messages", {
      text,
      externalId,
      buttonId: option?.buttonId,
      messageId: option?.messageId,
    });
    // No mobile o textarea foi desfocado no envio (Composer.handleSend) pra
    // fechar o teclado - refocar aqui reabriria. So no desktop mantem o foco
    // pro usuario continuar digitando sem precisar clicar de novo.
    if (!isMobile) composerRef.current?.focus();
    if (!ok) clearSelectionByUserMessage(externalId);
    setMessageStatus(externalId, ok ? "sent" : "failed");
  }

  async function handleSendFile(file: File) {
    const mediaType = mediaTypeFromFile(file);
    const externalId = ulid();
    pendingFilesRef.current.set(externalId, file);
    setMessages((prev) => [
      ...prev,
      {
        id: externalId,
        externalId,
        from: "user",
        time: nowTime(),
        date: new Date().toISOString(),
        type: "file",
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        mediaType,
        status: "sending",
      },
    ]);
    const { ok } = await postForm(
      "/api/app/messages/upload",
      buildUploadForm(mediaType, externalId, file),
    );
    composerRef.current?.focus();
    setMessageStatus(externalId, ok ? "sent" : "failed");
  }

  async function handleRetrySend(externalId: string) {
    const target = messagesRef.current.find((m) => m.externalId === externalId);
    if (!target || target.status !== "failed") return;
    setMessageStatus(externalId, "sending");
    await delay(2);

    if (target.type === "file") {
      const file = pendingFilesRef.current.get(externalId);
      if (!file || !target.mediaType) {
        setMessageStatus(externalId, "failed");
        return;
      }
      const { ok } = await postForm(
        "/api/app/messages/upload",
        buildUploadForm(target.mediaType, externalId, file),
      );
      setMessageStatus(externalId, ok ? "sent" : "failed");
      return;
    }

    const optionMessageId = target.buttonId
      ? findOpenOptionMessageId(messagesRef.current, target.buttonId)
      : null;
    if (target.buttonId && optionMessageId) {
      selectOption(optionMessageId, target.buttonId, externalId);
    }
    const { ok } = await postJson("/api/app/messages", {
      text: target.text ?? "",
      externalId,
      buttonId: target.buttonId,
      messageId: optionMessageId ?? undefined,
    });
    if (!ok) clearSelectionByUserMessage(externalId);
    setMessageStatus(externalId, ok ? "sent" : "failed");
  }

  function handleAudioPlay(externalId: string) {
    void postJson("/api/app/messages/played", { externalId }).catch(() => {});
  }

  function handleButtonClick(
    button: FormattedMessageButton,
    messageId: string,
  ) {
    if (button.type === "link" && button.url) {
      window.open(button.url, "_blank", "noopener,noreferrer");
      return;
    }
    const target = messagesRef.current.find((m) => m.id === messageId);
    if (!target?.interactive?.isOptionList) {
      void handleSend(button.label);
      return;
    }
    if (target.interactive.disabled || optimisticSelections[messageId]) return;
    void handleSend(button.label, { messageId, buttonId: button.id });
  }

  const displayedMessages = useMemo(
    () => applyOptimisticSelections(messages, optimisticSelections),
    [messages, optimisticSelections],
  );

  return (
    <ChatThread
      ref={composerRef}
      messages={displayedMessages}
      onSend={(text) => handleSend(text)}
      onSendFile={handleSendFile}
      onRetry={handleRetrySend}
      onAudioPlay={handleAudioPlay}
      onButtonClick={handleButtonClick}
      isWaitingForResponse={isWaitingForResponse || isSendPending}
      isTyping={isTyping}
      composerDisabled={starting}
      composerDisabledReason={starting ? t("preparing") : undefined}
      onLoadOlder={loadOlderMessages}
      hasMoreOlder={hasMoreOlder}
      isLoadingOlder={isLoadingOlder}
      showPendingReviewBanner={showPendingReview}
      pendingReviewCount={pendingReviewCount}
      onPracticeClick={() => handleSend("praticar")}
    />
  );
}

function buildUploadForm(
  mediaType: string,
  externalId: string,
  file: File,
): FormData {
  const formData = new FormData();
  formData.append("mediaType", mediaType);
  formData.append("externalId", externalId);
  formData.append("file", file);
  return formData;
}
