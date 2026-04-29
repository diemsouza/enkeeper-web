"use client";

import { notFound } from "next/navigation";
import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { WhatsAppChat } from "../../components/whatsapp-chat";
import { useScrollToBottom } from "../../hooks/use-scroll-to-bottom";
import { http } from "../../lib/http";
import { Input } from "@/src/components/ui/input";

interface Message {
  from: "user" | "bot";
  text: string;
  time: string;
}

function nowTime(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isoNow(): string {
  return new Date().toISOString();
}

const POLL_INTERVAL_MS = 1500;
const POLL_DURATION_MS = 12000;

export default function SimulatorPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [channelId, setChannelId] = useState("");
  const [loading, setLoading] = useState(false);
  const [cronResult, setCronResult] = useState<{ processed: number; skipped: number; errors: number } | null>(null);
  const [cronLoading, setCronLoading] = useState(false);

  const { containerRef, endRef, scrollToBottom } = useScrollToBottom();
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("simulator_channelId");
    if (saved) {
      setChannelId(saved);
    } else {
      const generated = `sim_${Date.now()}`;
      setChannelId(generated);
    }
  }, []);

  useEffect(() => {
    if (channelId) localStorage.setItem("simulator_channelId", channelId);
  }, [channelId]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (since: string, seenContents: Set<string>) => {
      stopPolling();

      let elapsed = 0;
      pollRef.current = setInterval(async () => {
        elapsed += POLL_INTERVAL_MS;
        if (elapsed >= POLL_DURATION_MS) {
          stopPolling();
          return;
        }

        try {
          const res = (await http(
            `/api/simulate?channelId=${encodeURIComponent(channelId)}&since=${encodeURIComponent(since)}`,
            {
              headers: { "x-simulate-secret": process.env.NEXT_PUBLIC_SIMULATE_SECRET ?? "" },
            }
          )) as { messages: { role: string; content: string; createdAt: string }[] };

          const newBotMsgs = res.messages.filter(
            (m) => m.role === "assistant" && !seenContents.has(m.content)
          );

          if (newBotMsgs.length > 0) {
            const time = nowTime();
            newBotMsgs.forEach((m) => seenContents.add(m.content));
            setMessages((prev) => [
              ...prev,
              ...newBotMsgs.map((m) => ({ from: "bot" as const, text: m.content, time })),
            ]);
            scrollToBottom("smooth");
          }
        } catch {
          // silently ignore poll errors
        }
      }, POLL_INTERVAL_MS);
    },
    [channelId, stopPolling, scrollToBottom]
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function fireCron() {
    setCronLoading(true);
    setCronResult(null);
    try {
      const res = await fetch("/api/cron/develop-activity");
      const data = await res.json();
      setCronResult(data);
      if (data.processed > 0) startPolling(isoNow(), new Set());
    } catch {
      setCronResult({ processed: 0, skipped: 0, errors: 1 });
    } finally {
      setCronLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const sentAt = isoNow();
    setMessages((prev) => [...prev, { from: "user", text, time: nowTime() }]);
    scrollToBottom("smooth");
    setLoading(true);
    stopPolling();

    try {
      const res = (await http("/api/simulate", {
        method: "POST",
        body: JSON.stringify({
          channelId,
          channelCode: channelId,
          channelType: "whatsapp",
          text,
          audioUrl: null,
          imageUrl: null,
        }),
        headers: {
          "x-simulate-secret": process.env.NEXT_PUBLIC_SIMULATE_SECRET ?? "",
        },
      })) as { reply: string[] };

      const replies = Array.isArray(res.reply) ? res.reply : [res.reply];
      const time = nowTime();
      const seenContents = new Set(replies.filter(Boolean));

      setMessages((prev) => [
        ...prev,
        ...replies.filter(Boolean).map((r) => ({ from: "bot" as const, text: r, time })),
      ]);
      scrollToBottom("smooth");

      // Polling para mensagens que chegam fora do response (ex: background jobs futuros)
      startPolling(sentAt, seenContents);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: `⚠️ ${msg}`, time: nowTime() },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom("smooth");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-0 gap-3">
      <h1 className="text-lg font-semibold text-gray-700">Simulador</h1>

      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1.5 font-medium">
          Canal
          <code className="bg-gray-200 px-2 py-1 rounded text-xs">whatsapp</code>
        </span>
        <label className="flex items-center gap-1.5 font-medium">
          ID
          <Input
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="border rounded px-2 py-0 h-6 font-mono text-xs w-36 focus:outline-none focus:ring-1 focus:ring-green-400"
            placeholder="5599999999999"
          />
        </label>
      </div>

      {!!messages.length && (
        <div
          ref={containerRef}
          className="overflow-y-auto max-h-[80vh] w-full md:w-[480px]"
        >
          <WhatsAppChat messages={messages} />
          <div ref={endRef} />
        </div>
      )}

      {loading && <p className="text-xs text-gray-400 -mt-1">digitando...</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={fireCron}
          disabled={cronLoading}
          className="text-xs bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-600 rounded-full px-3 py-1 transition-colors"
        >
          {cronLoading ? "disparando..." : "⚡ Disparar cron"}
        </button>
        {cronResult && (
          <span className="text-xs text-gray-500">
            {cronResult.processed} enviadas · {cronResult.skipped} puladas · {cronResult.errors} erros
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 w-full md:max-w-[480px]">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Digite uma mensagem..."
          disabled={loading}
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors shrink-0"
          aria-label="Enviar"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
