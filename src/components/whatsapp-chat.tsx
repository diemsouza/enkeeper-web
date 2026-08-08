"use client";

import { WhatsAppText } from "./shared/whatsapp-text";

export interface Message {
  from: "user" | "bot";
  text?: string;
  time: string;
  type?: "file" | "audio";
  fileName?: string;
  fileSize?: string;
  mediaType?: "image" | "pdf" | "text";
  audioUrl?: string;
  textFallback?: string;
  externalId?: string;
}

function FileCard({
  fileName,
  fileSize,
  mediaType,
}: {
  fileName: string;
  fileSize: string;
  mediaType?: "image" | "pdf" | "text";
}) {
  const badge =
    mediaType === "image" ? "IMG" : mediaType === "text" ? "TXT" : "PDF";
  const badgeColor =
    mediaType === "image"
      ? "bg-blue-500"
      : mediaType === "text"
        ? "bg-gray-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className={`w-10 h-10 rounded-lg ${badgeColor} flex items-center justify-center shrink-0`}
      >
        <span className="text-white text-[10px] font-bold tracking-wide">
          {badge}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[13px] leading-tight">{fileName}</p>
        <p className="text-[11px] opacity-50 mt-0.5">{fileSize}</p>
      </div>
    </div>
  );
}

function AudioCard({
  audioUrl,
  textFallback,
  externalId,
  onPlay,
}: {
  audioUrl: string;
  textFallback?: string;
  externalId?: string;
  onPlay?: (externalId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 py-1 min-w-[220px]">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-4 h-4"
          >
            <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
            <path d="M17 11a1 1 0 10-2 0 3 3 0 01-6 0 1 1 0 10-2 0 5 5 0 004 4.9V18H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.1a5 5 0 004-4.9z" />
          </svg>
        </div>
        <audio
          controls
          src={audioUrl}
          className="h-8 flex-1"
          onPlay={() => externalId && onPlay?.(externalId)}
        />
      </div>
      {/* {textFallback && (
        <p className="text-[11px] opacity-50 italic">{textFallback}</p>
      )} */}
    </div>
  );
}

export function WhatsAppChat({
  messages,
  onAudioPlay,
}: {
  messages: Message[];
  onAudioPlay?: (externalId: string) => void;
}) {
  return (
    <div className="bg-[#EBE5DC] dark:bg-[#0B141A] md:rounded-[20px] p-4 w-full md:w-[480px] flex flex-col gap-1.5">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={
            msg.from === "user" ? "flex justify-end" : "flex justify-start"
          }
        >
          <div
            className={
              msg.from === "user"
                ? "bg-[#DCF8C6] dark:bg-[#005C4B] text-[#1a1a1a] dark:text-[#e9edef] rounded-[10px_10px_2px_10px] px-3 pt-2 pb-1.5 text-[13.5px] max-w-[70%]"
                : "bg-white dark:bg-[#202C33] text-[#1a1a1a] dark:text-[#e9edef] border border-black/[0.08] rounded-[10px_10px_10px_2px] px-3 pt-2 pb-1.5 text-[13.5px] max-w-[70%]"
            }
          >
            {msg.type === "file" ? (
              <FileCard
                fileName={msg.fileName!}
                fileSize={msg.fileSize!}
                mediaType={msg.mediaType}
              />
            ) : msg.type === "audio" ? (
              <AudioCard
                audioUrl={msg.audioUrl!}
                textFallback={msg.textFallback}
                externalId={msg.externalId}
                onPlay={onAudioPlay}
              />
            ) : (
              <p className="whitespace-pre-line leading-[1.5]">
                <WhatsAppText text={msg.text ?? ""} />
              </p>
            )}
            <p className="text-[10.5px] opacity-55 mt-0.5 text-right">
              {msg.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
