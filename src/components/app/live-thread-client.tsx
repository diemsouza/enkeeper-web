"use client";

import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatThread } from "@/src/components/chat/thread";
import type { ComposerHandle } from "@/src/components/chat/composer";
import type { FormattedMessageButton, Message } from "@/src/components/chat/types";
import { getJson, postForm, postJson } from "@/src/lib/api-client";
import { useRealtimeMessages } from "@/src/hooks/use-realtime-messages";

type MessagesResponse = { messages: Message[]; hasMore: boolean };

const MIN_TYPING_MS = 900;
const MIN_LOADING_OLDER_MS = 400;

function nowTime(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
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

export function LiveThreadClient({
  userId,
  initialMessages,
  initialHasMoreOlder,
  needsAutoStart,
}: {
  userId: string;
  initialMessages: Message[];
  initialHasMoreOlder: boolean;
  needsAutoStart: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [optimistic, setOptimistic] = useState<Message | null>(null);
  const [sendStartedAt, setSendStartedAt] = useState<number | null>(null);
  const [starting, setStarting] = useState(needsAutoStart);
  const [waitTimedOut, setWaitTimedOut] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(initialHasMoreOlder);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const autoStartTriggered = useRef(false);
  const composerRef = useRef<ComposerHandle>(null);

  const refreshMessages = useCallback(async () => {
    const { ok, body } = await getJson<MessagesResponse>("/api/app/messages");
    if (!ok) return;

    const existingIds = new Set(messages.map((m) => m.id));
    const newTail = body.messages.filter((m) => !existingIds.has(m.id));
    const newUserMessages = newTail.filter((m) => m.from === "user");
    const newBotMessages = newTail.filter((m) => m.from !== "user");

    if (newUserMessages.length > 0) {
      setMessages((prev) => {
        const prevIds = new Set(prev.map((m) => m.id));
        const stillNew = newUserMessages.filter((m) => !prevIds.has(m.id));
        return stillNew.length > 0 ? [...prev, ...stillNew] : prev;
      });
      setOptimistic(null);
    }

    if (newBotMessages.length === 0) {
      if (body.messages.length > 0) setStarting(false);
      return;
    }

    const revealBotMessages = () => {
      setMessages((prev) => {
        const prevIds = new Set(prev.map((m) => m.id));
        const stillNew = newBotMessages.filter((m) => !prevIds.has(m.id));
        return stillNew.length > 0 ? [...prev, ...stillNew] : prev;
      });
      setSendStartedAt(null);
      setStarting(false);
    };

    const elapsed = sendStartedAt !== null ? Date.now() - sendStartedAt : MIN_TYPING_MS;
    const wait = Math.max(MIN_TYPING_MS - elapsed, 0);
    if (wait > 0) {
      setTimeout(revealBotMessages, wait);
      return;
    }
    revealBotMessages();
  }, [messages, sendStartedAt]);

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

  useRealtimeMessages(userId, () => void refreshMessages(), triggerAutoStart);

  useEffect(() => {
    if (!needsAutoStart) return;
    // Rede lenta ou canal Realtime indisponível: garante que o onboarding
    // ainda dispara em vez de travar esperando o evento "SUBSCRIBED".
    const fallback = setTimeout(triggerAutoStart, 3000);
    return () => clearTimeout(fallback);
  }, [needsAutoStart, triggerAutoStart]);

  const displayedMessages = optimistic ? [...messages, optimistic] : messages;
  const lastMessage = displayedMessages[displayedMessages.length - 1];
  const isLastFromUser = lastMessage?.from === "user";
  const isWaitingForResponse = isLastFromUser && !waitTimedOut;

  useEffect(() => {
    if (!isLastFromUser) {
      setWaitTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setWaitTimedOut(true), 10_000);
    return () => clearTimeout(timer);
  }, [isLastFromUser, lastMessage?.id]);

  async function handleSend(text: string) {
    setOptimistic({ id: `temp-${nanoid()}`, from: "user", text, time: nowTime() });
    setSendStartedAt(Date.now());
    const { ok } = await postJson("/api/app/messages", { text });
    composerRef.current?.focus();
    if (!ok) {
      setOptimistic(null);
      setSendStartedAt(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${nanoid()}`,
          from: "bot",
          text: "⚠️ Não foi possível enviar sua mensagem. Tente novamente.",
          time: nowTime(),
        },
      ]);
    }
  }

  async function handleSendFile(file: File) {
    const mediaType = mediaTypeFromFile(file);
    setOptimistic({
      id: `temp-${nanoid()}`,
      from: "user",
      time: nowTime(),
      type: "file",
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      mediaType,
    });
    setSendStartedAt(Date.now());
    const formData = new FormData();
    formData.append("mediaType", mediaType);
    formData.append("file", file);
    const { ok } = await postForm("/api/app/messages/upload", formData);
    composerRef.current?.focus();
    if (!ok) {
      setOptimistic(null);
      setSendStartedAt(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${nanoid()}`,
          from: "bot",
          text: "⚠️ Não foi possível enviar o arquivo. Tente novamente.",
          time: nowTime(),
        },
      ]);
    }
  }

  function handleAudioPlay(externalId: string) {
    void postJson("/api/app/messages/played", { externalId }).catch(() => {});
  }

  function handleButtonClick(button: FormattedMessageButton) {
    if (button.type === "link" && button.url) {
      window.open(button.url, "_blank", "noopener,noreferrer");
      return;
    }
    void handleSend(button.label);
  }

  return (
    <ChatThread
      ref={composerRef}
      messages={displayedMessages}
      onSend={handleSend}
      onSendFile={handleSendFile}
      onAudioPlay={handleAudioPlay}
      onButtonClick={handleButtonClick}
      isWaitingForResponse={isWaitingForResponse}
      isTyping={sendStartedAt !== null}
      composerDisabled={starting}
      composerDisabledReason={starting ? "Preparando sua prática..." : undefined}
      onLoadOlder={loadOlderMessages}
      hasMoreOlder={hasMoreOlder}
      isLoadingOlder={isLoadingOlder}
    />
  );
}
