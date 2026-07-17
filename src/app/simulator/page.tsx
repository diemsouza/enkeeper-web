"use client";

import { notFound } from "next/navigation";
import { useState, useEffect, useRef, useCallback, KeyboardEvent } from "react";
import { WhatsAppChat, Message } from "../../components/whatsapp-chat";
import { useScrollToBottom } from "../../hooks/use-scroll-to-bottom";
import { http } from "../../lib/http";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { startOfDay } from "date-fns";

type ApiMessage = {
  role: string;
  content: string;
  createdAt: string;
  mediaType?: string | null;
  metadata?: Record<string, string | number | null> | null;
};

function normalizeSimulatorText(text: string): string {
  return text.replace(/[ \t]{3,}/g, "  ").replace(/\n{4,}/g, "\n\n\n");
}

function detectMediaType(file: File): "image" | "pdf" | "text" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  return "text";
}

function mediaTypeLabel(mediaType: "image" | "pdf" | "text"): string {
  if (mediaType === "image") return "Imagem";
  if (mediaType === "pdf") return "PDF";
  return "Texto";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function nowTime(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapApiMessages(raw: ApiMessage[]): Message[] {
  return raw.map((m) => {
    const from = m.role === "user" ? "user" : "bot";
    const time = formatTime(m.createdAt);
    if (m.mediaType === "image" || m.mediaType === "pdf" || m.mediaType === "text") {
      const metadata = m.metadata ?? {};
      const fileName = typeof metadata.file_name === "string" ? metadata.file_name : "Arquivo";
      const sizeBytes = typeof metadata.size_bytes === "number" ? metadata.size_bytes : 0;
      const label = mediaTypeLabel(m.mediaType);
      return {
        from,
        time,
        type: "file",
        fileName,
        fileSize: `${label} · ${formatFileSize(sizeBytes)}`,
        mediaType: m.mediaType,
      };
    }
    return { from, text: m.content, time };
  });
}

const SECRET = process.env.NEXT_PUBLIC_SIMULATE_SECRET ?? "";

export default function SimulatorPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [channelId, setChannelId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { containerRef, endRef, scrollToBottom } = useScrollToBottom();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("simulator_channelId");
    setChannelId(saved ?? `sim_${Date.now()}`);
  }, []);

  useEffect(() => {
    if (channelId) localStorage.setItem("simulator_channelId", channelId);
  }, [channelId]);

  const fetchAll = useCallback(async (): Promise<void> => {
    if (!channelId) return;
    try {
      const res = (await http(
        `/api/dev/messages?channelId=${encodeURIComponent(channelId)}&after=${encodeURIComponent(startOfDay(new Date()).toISOString())}`,
      )) as { messages: ApiMessage[] };
      setMessages(mapApiMessages(res.messages));
      scrollToBottom("instant");
    } catch {
      // ignore
    }
  }, [channelId, scrollToBottom]);

  useEffect(() => {
    if (!channelId) return;
    fetchAll();

    const url = `/api/dev/sse?channelId=${encodeURIComponent(channelId)}&secret=${encodeURIComponent(SECRET)}`;
    const es = new EventSource(url);

    es.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data as string) as { type: string; text?: string; time?: string };
      if (data.type === "message" && data.text && data.time) {
        setMessages((prev) => [
          ...prev,
          { from: "bot", text: data.text!, time: formatTime(data.time!) },
        ]);
        scrollToBottom("smooth");
      }
      if (data.type === "done") {
        fetchAll();
      }
    };

    return () => es.close();
  }, [channelId, fetchAll, scrollToBottom]);

  async function sendMessage() {
    const text = input.trim();
    if (!text && !selectedFile) return;

    if (selectedFile) {
      const file = selectedFile;
      setSelectedFile(null);
      setInput("");

      const mediaType = detectMediaType(file);
      const label = mediaTypeLabel(mediaType);
      setMessages((prev) => [
        ...prev,
        {
          from: "user",
          time: nowTime(),
          type: "file",
          fileName: file.name,
          fileSize: `${label} · ${formatFileSize(file.size)}`,
          mediaType,
        },
      ]);
      scrollToBottom("smooth");

      const formData = new FormData();
      formData.append("channelId", channelId);
      formData.append("channelCode", channelId);
      formData.append("channelType", "whatsapp");
      formData.append("mediaType", mediaType);
      formData.append("file", file);

      try {
        await fetch("/api/simulate", {
          method: "POST",
          headers: { "x-simulate-secret": SECRET },
          body: formData,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setMessages((prev) => [...prev, { from: "bot", text: `⚠️ ${msg}`, time: nowTime() }]);
      }
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, { from: "user", text, time: nowTime() }]);
    scrollToBottom("smooth");

    try {
      await http("/api/simulate", {
        method: "POST",
        body: JSON.stringify({
          channelId,
          channelCode: channelId,
          channelType: "whatsapp",
          text,
        }),
        headers: { "x-simulate-secret": SECRET },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setMessages((prev) => [...prev, { from: "bot", text: `⚠️ ${msg}`, time: nowTime() }]);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (e.target) e.target.value = "";
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-0 gap-3">
      <h1 className="text-lg font-semibold text-gray-700">Simulador</h1>

      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span className="flex items-center gap-1.5 font-medium">
          Canal
          <code className="bg-gray-200 px-2 py-1 rounded text-xs">
            whatsapp
          </code>
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

      <div className="flex items-center gap-2">
        <button
          onClick={() => void fetch("/api/cron/develop-activity")}
          className="text-xs bg-white border border-gray-300 hover:bg-gray-50 text-gray-600 rounded-full px-3 py-1 transition-colors"
        >
          ⚡ Cron Activity
        </button>
      </div>

      {selectedFile && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1">
          <span>{selectedFile.name}</span>
          <button
            onClick={() => setSelectedFile(null)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Remover arquivo"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 w-full md:max-w-[480px]">
        <input
          type="file"
          accept="image/*,application/pdf,text/plain,text/markdown,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
          ref={fileInputRef}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          aria-label="Anexar arquivo"
          title="Enviar imagem, PDF ou texto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M18.97 3.659a2.25 2.25 0 00-3.182 0l-10.94 10.94a3.75 3.75 0 105.304 5.303l7.693-7.693a.75.75 0 011.06 1.06l-7.693 7.693a5.25 5.25 0 11-7.424-7.424l10.939-10.94a3.75 3.75 0 115.303 5.304L9.097 18.835l-.008.008-.007.007-.002.002-.003.002A2.25 2.25 0 015.91 15.66l7.81-7.81a.75.75 0 011.061 1.06l-7.81 7.81a.75.75 0 001.054 1.068L18.97 6.84a2.25 2.25 0 000-3.182z" clipRule="evenodd" />
          </svg>
        </button>
        <Textarea
          ref={inputRef}
          rows={4}
          value={input}
          onChange={(e) => setInput(normalizeSimulatorText(e.target.value))}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder={selectedFile ? "Pressione Enter para enviar o arquivo..." : "Digite uma mensagem..."}
          className="flex-1 min-h-0 max-h-40 resize-none border rounded-2xl px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-green-400"
        />
        <button
          onClick={() => void sendMessage()}
          disabled={!input.trim() && !selectedFile}
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
