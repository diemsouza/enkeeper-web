"use client";

import { cn } from "@/src/lib/utils";
import { WhatsAppText } from "./shared/whatsapp-text";
import type { FormattedMessageButton } from "@/src/types/out-message";

export interface Message {
  from: "user" | "bot";
  text?: string;
  time: string;
  type?: "file" | "audio" | "voice" | "image";
  fileName?: string;
  fileSize?: string;
  mediaType?: "image" | "pdf" | "text";
  audioUrl?: string;
  imageUrl?: string;
  caption?: string;
  textFallback?: string;
  externalId?: string;
  duration?: string;
  interactive?: { body: string; buttons: FormattedMessageButton[] } | null;
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

function LinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="w-3.5 h-3.5 shrink-0"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H18a2 2 0 012 2v4.5M18 6L9.75 14.25M10.5 6H8a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-2.5"
      />
    </svg>
  );
}

function InteractiveButtonList({
  buttons,
  onButtonClick,
}: {
  buttons: FormattedMessageButton[];
  onButtonClick?: (button: FormattedMessageButton) => void;
}) {
  return (
    <div className="-mx-3 mt-2 border-t border-black/10 dark:border-white/10">
      {buttons.map((button, i) => {
        const rowClassName = cn(
          "flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-[13.5px] font-medium text-[#0a84c7] dark:text-[#53bdeb] transition-colors hover:bg-black/5 dark:hover:bg-white/5",
          i > 0 && "border-t border-black/10 dark:border-white/10",
        );
        if (button.type === "link" && button.url) {
          return (
            <a
              key={button.id}
              href={button.url}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClassName}
            >
              {button.label}
              <LinkIcon />
            </a>
          );
        }
        return (
          <button
            key={button.id}
            type="button"
            onClick={() => onButtonClick?.(button)}
            className={rowClassName}
          >
            {button.label}
          </button>
        );
      })}
    </div>
  );
}

export function WhatsAppChat({
  messages,
  onAudioPlay,
  onButtonClick,
  widthClassName = "w-full md:w-[480px]",
  maxHeightClassName,
}: {
  messages: Message[];
  onAudioPlay?: (externalId: string) => void;
  onButtonClick?: (button: FormattedMessageButton) => void;
  widthClassName?: string;
  maxHeightClassName?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[#EBE5DC] dark:bg-[#0B141A] md:rounded-[20px] relative z-0 overflow-hidden flex flex-col",
        widthClassName,
        maxHeightClassName && [maxHeightClassName], // A altura máxima limita este container fixo
      )}
    >
      <div className="absolute inset-0 bg-[url('/images/wa-background.svg')] bg-repeat opacity-[0.06] dark:opacity-[0.05] dark:invert pointer-events-none z-0" />
      <div className="w-full h-full p-4 flex flex-col gap-1.5 overflow-y-auto scrollbar-hide relative z-10">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "relative z-10",
              msg.from === "user" ? "flex justify-end" : "flex justify-start",
            )}
          >
            <div
              className={cn(
                msg.from === "user"
                  ? "bg-[#DCF8C6] dark:bg-[#005C4B] text-[#1a1a1a] dark:text-[#e9edef] rounded-[10px_10px_2px_10px]"
                  : "bg-white dark:bg-[#202C33] text-[#1a1a1a] dark:text-[#e9edef] border border-black/[0.08] rounded-[10px_10px_10px_2px]",
                "px-3 pt-2 pb-1.5 text-[13.5px]",
                msg.type === "file" || msg.type === "voice" || msg.interactive
                  ? "max-w-[85%]"
                  : "max-w-[70%]",
                msg.type === "image" && "w-[85%] max-w-[85%] overflow-hidden",
              )}
            >
              {msg.type === "file" ? (
                <FileCard
                  fileName={msg.fileName!}
                  fileSize={msg.fileSize!}
                  mediaType={msg.mediaType}
                />
              ) : msg.type === "image" ? (
                <div className="flex flex-col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={msg.imageUrl!}
                    alt=""
                    className="block -mx-3 -mt-2 w-[calc(100%_+_1.5rem)] max-w-none"
                  />
                  {msg.caption && (
                    <p className="whitespace-pre-line leading-[1.5] break-words mt-2">
                      <WhatsAppText text={msg.caption} />
                    </p>
                  )}
                </div>
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
                  <WhatsAppText
                    text={msg.interactive?.body ?? msg.text ?? ""}
                  />
                </p>
              )}
              <p className="text-[10.5px] opacity-55 mt-0.5 text-right">
                {msg.time}
              </p>
              {msg.interactive && (
                <InteractiveButtonList
                  buttons={msg.interactive.buttons}
                  onButtonClick={onButtonClick}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
