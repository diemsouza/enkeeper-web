import { useState } from "react";
import { AlertCircle, Check, Clock3 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { CustomAudioPlayer } from "./custom-audio-player";
import { FileCard } from "./file-card";
import { ImageBubble } from "./image-bubble";
import { InteractiveButtonList } from "./interactive-buttons";
import { TextBubble } from "./text-bubble";
import type { FormattedMessageButton, Message } from "./types";
import { VoiceNoteCard } from "./voice-note-card";

export function MessageBubble({
  message,
  isNew,
  onRetry,
  onAudioPlay,
  onButtonClick,
}: {
  message: Message;
  isNew?: boolean;
  onRetry?: (externalId: string) => void;
  onAudioPlay?: (externalId: string) => void;
  onButtonClick?: (button: FormattedMessageButton) => void;
}) {
  const isUser = message.from === "user";
  const [shouldAnimate] = useState(isNew);

  return (
    <div
      className={cn(
        "relative z-10",
        shouldAnimate && "animate-message-in",
        isUser ? "flex flex-col items-end" : "flex flex-col items-start",
      )}
    >
      <div
        className={cn(
          isUser
            ? "bg-primary text-primary-foreground rounded-[10px_10px_2px_10px]"
            : "bg-white text-foreground dark:bg-[#1C1C1E] rounded-[10px_10px_10px_2px]",
          "px-3 pt-2 pb-1.5 text-[15px] md:text-[14px]",
          "min-w-[80px] max-w-[85%] md:max-w-[70%]",
          message.type === "image" &&
            "w-[85%] md:w-[70%] max-w-[85%] md:max-w-[70%] overflow-hidden",
        )}
      >
        {message.type === "file" ? (
          <FileCard
            fileName={message.fileName!}
            fileSize={message.fileSize!}
            mediaType={message.mediaType}
          />
        ) : message.type === "image" ? (
          <ImageBubble imageUrl={message.imageUrl!} caption={message.caption} />
        ) : message.type === "audio" ? (
          <CustomAudioPlayer
            audioUrl={message.audioUrl!}
            externalId={message.externalId}
            onPlay={onAudioPlay}
            textFallback={message.textFallback}
          />
        ) : message.type === "voice" ? (
          <VoiceNoteCard duration={message.duration ?? ""} />
        ) : (
          <TextBubble text={message.interactive?.body ?? message.text ?? ""} />
        )}
        <div className="mt-0.5 flex items-center justify-end gap-1">
          <p className="text-[10.5px] opacity-55 text-right">{message.time}</p>
          {isUser && message.status === "sending" && (
            <Clock3 className="h-3 w-3 opacity-55" aria-label="Enviando" />
          )}
          {isUser && message.status === "failed" && (
            <button
              type="button"
              onClick={() => onRetry?.(message.externalId ?? message.id)}
              aria-label="Reenviar mensagem"
              className="flex items-center text-red-200 transition-opacity hover:opacity-80"
            >
              <AlertCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {message.interactive && (
          <InteractiveButtonList
            buttons={message.interactive.buttons}
            onButtonClick={onButtonClick}
          />
        )}
      </div>
      {isUser && message.status === "failed" && (
        <div className="mt-1 flex items-center gap-1.5 px-1 text-sm text-muted-foreground">
          <span>Mensagem não enviada.</span>
          <button
            type="button"
            onClick={() => onRetry?.(message.externalId ?? message.id)}
            className="font-medium text-primary underline underline-offset-2 transition-opacity hover:opacity-80"
          >
            Reenviar
          </button>
        </div>
      )}
    </div>
  );
}
