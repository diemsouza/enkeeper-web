"use client";

import { ulid } from "ulid";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatThread } from "@/src/components/chat/thread";
import type { ComposerHandle } from "@/src/components/chat/composer";
import { mapBroadcastRecord } from "@/src/components/chat/map-messages";
import type {
  FormattedMessageButton,
  Message,
  MessageStatus,
} from "@/src/components/chat/types";
import { getJson, postForm, postJson } from "@/src/lib/api-client";
import { useRealtimeMessages } from "@/src/hooks/use-realtime-messages";
import { setupAudioUnlock } from "@/src/lib/audio-unlock";
import { delay } from "@/src/lib/utils";

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

function sameMessage(a: Message, key: string): boolean {
  return a.id === key || a.externalId === key;
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
  const [starting, setStarting] = useState(needsAutoStart);
  const [waitTimedOut, setWaitTimedOut] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(initialHasMoreOlder);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const autoStartTriggered = useRef(false);
  const composerRef = useRef<ComposerHandle>(null);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const replyWaitStartedAtRef = useRef<number | null>(null);
  const pendingFilesRef = useRef<Map<string, File>>(new Map());

  const setMessageStatus = useCallback(
    (externalId: string, status: MessageStatus) => {
      if (status === "sent") pendingFilesRef.current.delete(externalId);
      setMessages((prev) =>
        prev.map((m) =>
          m.externalId === externalId ? { ...m, status } : m,
        ),
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
        if (!m.status || m.status === "sent" || !m.externalId) return m;
        const server = body.messages.find(
          (s) => s.externalId === m.externalId,
        );
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
  }, []);

  const handleRealtimeEvent = (
    record: Record<string, unknown> | undefined,
  ): void => {
    if (!record) {
      void refreshMessages();
      return;
    }
    const mapped = mapBroadcastRecord(record);
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
      return;
    }

    if (messagesRef.current.some((m) => sameMessage(m, key))) return;

    const elapsed =
      replyWaitStartedAtRef.current !== null
        ? Date.now() - replyWaitStartedAtRef.current
        : MIN_TYPING_MS;
    const wait = Math.max(MIN_TYPING_MS - elapsed, 0);
    const reveal = (): void => {
      setMessages((prev) =>
        prev.some((m) => sameMessage(m, key)) ? prev : [...prev, mapped],
      );
      replyWaitStartedAtRef.current = null;
      setStarting(false);
    };
    if (wait > 0) setTimeout(reveal, wait);
    else reveal();
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

  useRealtimeMessages(
    userId,
    handleRealtimeEvent,
    () => void refreshMessages(),
    triggerAutoStart,
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
  const isWaitingForResponse =
    isLastFromUser && lastMessage?.status !== "failed" && !waitTimedOut;
  const isTyping =
    isLastFromUser && lastMessage?.status === "sent" && !waitTimedOut;

  useEffect(() => {
    if (!isLastFromUser || lastMessage?.status === "failed") {
      setWaitTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setWaitTimedOut(true), 10_000);
    return () => clearTimeout(timer);
  }, [isLastFromUser, lastKey, lastMessage?.status]);

  useEffect(() => {
    setupAudioUnlock();
  }, []);

  async function handleSend(text: string) {
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
      },
    ]);
    replyWaitStartedAtRef.current = Date.now();
    const { ok } = await postJson("/api/app/messages", { text, externalId });
    composerRef.current?.focus();
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
    replyWaitStartedAtRef.current = Date.now();
    const { ok } = await postForm(
      "/api/app/messages/upload",
      buildUploadForm(mediaType, externalId, file),
    );
    composerRef.current?.focus();
    setMessageStatus(externalId, ok ? "sent" : "failed");
  }

  async function handleRetrySend(externalId: string) {
    const target = messagesRef.current.find(
      (m) => m.externalId === externalId,
    );
    if (!target || target.status !== "failed") return;
    setMessageStatus(externalId, "sending");
    await delay(2);

    if (target.type === "file") {
      const file = pendingFilesRef.current.get(externalId);
      if (!file || !target.mediaType) {
        setMessageStatus(externalId, "failed");
        return;
      }
      replyWaitStartedAtRef.current = Date.now();
      const { ok } = await postForm(
        "/api/app/messages/upload",
        buildUploadForm(target.mediaType, externalId, file),
      );
      setMessageStatus(externalId, ok ? "sent" : "failed");
      return;
    }

    replyWaitStartedAtRef.current = Date.now();
    const { ok } = await postJson("/api/app/messages", {
      text: target.text ?? "",
      externalId,
    });
    setMessageStatus(externalId, ok ? "sent" : "failed");
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
      messages={messages}
      onSend={handleSend}
      onSendFile={handleSendFile}
      onRetry={handleRetrySend}
      onAudioPlay={handleAudioPlay}
      onButtonClick={handleButtonClick}
      isWaitingForResponse={isWaitingForResponse}
      isTyping={isTyping}
      composerDisabled={starting}
      composerDisabledReason={
        starting ? "Preparando sua prática..." : undefined
      }
      onLoadOlder={loadOlderMessages}
      hasMoreOlder={hasMoreOlder}
      isLoadingOlder={isLoadingOlder}
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
