"use client";

import { cn } from "@/src/lib/utils";
import { WhatsAppText } from "./shared/whatsapp-text";

export interface Message {
  from: "user" | "bot";
  text?: string;
  time: string;
  type?: "file" | "audio" | "voice";
  fileName?: string;
  fileSize?: string;
  mediaType?: "image" | "pdf" | "text";
  audioUrl?: string;
  textFallback?: string;
  externalId?: string;
  duration?: string;
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

const VOICE_WAVEFORM = [
  6, 12, 18, 10, 22, 14, 8, 20, 12, 16, 9, 24, 13, 7, 19, 11, 15, 8, 21, 10, 6,
  14, 20, 9, 17, 23, 11, 15, 8, 19, 12, 21, 10, 16, 7, 18, 13, 22,
];

function VoiceNoteCard({ duration }: { duration: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[240px]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-8 h-8 shrink-0 text-gray-500 dark:text-gray-600"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
      <div className="flex-1 relative min-w-0">
        <div className="flex items-center gap-[2px] h-6 w-full overflow-hidden">
          <div className="w-2 h-2 rounded-full bg-current shrink-0" />
          {VOICE_WAVEFORM.map((h, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-current opacity-40 shrink-0"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <span className="absolute left-0 top-full mt-0.5 text-[10px] opacity-60">
          {duration}
        </span>
      </div>
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full bg-gray-500 dark:bg-gray-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">F</span>
        </div>
        <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-500 flex items-center justify-center ring-2 ring-[#EBE5DC] dark:ring-[#0B141A]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-3 h-3"
          >
            <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
            <path d="M17 11a1 1 0 10-2 0 3 3 0 01-6 0 1 1 0 10-2 0 5 5 0 004 4.9V18H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.1a5 5 0 004-4.9z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppChat({
  messages,
  onAudioPlay,
  widthClassName = "w-full md:w-[480px]",
  maxHeightClassName,
}: {
  messages: Message[];
  onAudioPlay?: (externalId: string) => void;
  widthClassName?: string;
  maxHeightClassName?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[#EBE5DC] dark:bg-[#0B141A] md:rounded-[20px] p-4 flex flex-col gap-1.5",
        widthClassName,
        maxHeightClassName && [maxHeightClassName, "overflow-y-auto scrollbar-hide"],
      )}
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          className={
            msg.from === "user" ? "flex justify-end" : "flex justify-start"
          }
        >
          <div
            className={cn(
              msg.from === "user"
                ? "bg-[#DCF8C6] dark:bg-[#005C4B] text-[#1a1a1a] dark:text-[#e9edef] rounded-[10px_10px_2px_10px]"
                : "bg-white dark:bg-[#202C33] text-[#1a1a1a] dark:text-[#e9edef] border border-black/[0.08] rounded-[10px_10px_10px_2px]",
              "px-3 pt-2 pb-1.5 text-[13.5px]",
              msg.type === "file" || msg.type === "voice"
                ? "max-w-[85%]"
                : "max-w-[70%]",
            )}
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
            ) : msg.type === "voice" ? (
              <VoiceNoteCard duration={msg.duration ?? ""} />
            ) : (
              <p className="whitespace-pre-line leading-[1.5] break-words">
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
