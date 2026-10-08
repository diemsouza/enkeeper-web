import { useRef, useState, type SyntheticEvent } from "react";
import { AlertCircle, Check, Clock3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/lib/utils";
import { exportBubbleAsPng } from "@/src/lib/export-bubble";
import { CustomAudioPlayer } from "./custom-audio-player";
import { FileCard } from "./file-card";
import { ImageBubble } from "./image-bubble";
import { InteractiveButtonList } from "./interactive-buttons";
import { TextBubble } from "./text-bubble";
import type { FormattedMessageButton, Message } from "./types";
import { VoiceNoteCard } from "./voice-note-card";

// No mobile, bolha do sistema com a mesma largura do card de audio:
// 260px do player (custom-audio-player) + 24px do px-3 da bolha.
const BOT_BUBBLE_MOBILE_WIDTH = "w-[284px] max-w-full";

export function MessageBubble({
  message,
  isNew,
  onRetry,
  onAudioPlay,
  onButtonClick,
  zoomDisabled,
  wide,
  fluidAudio,
}: {
  message: Message;
  isNew?: boolean;
  onRetry?: (externalId: string) => void;
  onAudioPlay?: (externalId: string) => void;
  onButtonClick?: (button: FormattedMessageButton, messageId: string) => void;
  zoomDisabled?: boolean;
  wide?: boolean;
  fluidAudio?: boolean;
}) {
  const isUser = message.from === "user";
  const [shouldAnimate] = useState(isNew);
  const t = useTranslations("app.chat");
  const tErrors = useTranslations("app.errors");
  const maxWidth = wide
    ? "max-w-[97%] md:max-w-[95%]"
    : "max-w-[85%] md:max-w-[70%]";
  const imageWidth = wide ? "w-[97%] md:w-[420px]" : "w-[85%] md:w-[420px]";
  const isAudio = message.type === "audio";
  const hasAudioWidth = !isUser && !isAudio && !wide;
  const bubbleRef = useRef<HTMLDivElement>(null);

  async function exportBubble(event: SyntheticEvent): Promise<void> {
    event.preventDefault();
    if (!bubbleRef.current) return;
    await exportBubbleAsPng(bubbleRef.current, message.id);
  }

  return (
    <div
      className={cn(
        "relative z-10",
        shouldAnimate && "animate-message-in",
        isUser ? "flex flex-col items-end" : "flex flex-col items-start",
      )}
    >
      <div
        ref={bubbleRef}
        className={cn(
          isUser
            ? "bg-primary text-primary-foreground rounded-[10px_10px_2px_10px]"
            : "bg-white text-foreground dark:bg-[#252529] rounded-[10px_10px_10px_2px]",
          "px-3 pt-2 pb-1.5 text-[15px] md:text-[14px]",
          isAudio && !fluidAudio && "shrink-0",
          isAudio && fluidAudio && cn("w-full", maxWidth),
          !isAudio && cn("min-w-[80px]", maxWidth),
          message.type === "image" &&
            cn(imageWidth, maxWidth, "overflow-hidden"),
          hasAudioWidth && BOT_BUBBLE_MOBILE_WIDTH,
          hasAudioWidth && message.type !== "image" && "md:w-auto",
        )}
      >
        {message.type === "file" ? (
          <FileCard
            fileName={message.fileName!}
            fileSize={message.fileSize!}
            mediaType={message.mediaType}
          />
        ) : message.type === "image" ? (
          <ImageBubble
            imageUrl={message.imageUrl!}
            caption={message.interactive?.body ?? message.caption}
            zoomDisabled={zoomDisabled}
          />
        ) : message.type === "audio" ? (
          <CustomAudioPlayer
            audioUrl={message.audioUrl!}
            audioContentType={message.audioContentType}
            externalId={message.externalId}
            onPlay={onAudioPlay}
            textFallback={message.textFallback}
            translation={message.translation}
            time={message.time}
            fluid={fluidAudio}
            onExport={exportBubble}
          />
        ) : message.type === "voice" ? (
          <VoiceNoteCard duration={message.duration ?? ""} />
        ) : (
          <TextBubble text={message.interactive?.body ?? message.text ?? ""} />
        )}
        {message.type !== "audio" && (
          <div className="mt-0.5 flex items-center justify-end gap-1">
            <p
              className="select-none text-[10.5px] opacity-55 text-right"
              onDoubleClick={exportBubble}
              onContextMenu={exportBubble}
            >
              {message.time}
            </p>
            {isUser && message.status === "sending" && (
              <Clock3
                className="h-3 w-3 opacity-55"
                aria-label={t("sending_aria")}
              />
            )}
            {isUser && message.status === "failed" && (
              <button
                type="button"
                onClick={() => onRetry?.(message.externalId ?? message.id)}
                aria-label={tErrors("resend_aria")}
                className="flex items-center text-red-200 transition-opacity hover:opacity-80"
              >
                <AlertCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
        {message.interactive && (
          <InteractiveButtonList
            interactive={message.interactive}
            onButtonClick={(button) => onButtonClick?.(button, message.id)}
          />
        )}
      </div>
      {isUser && message.status === "failed" && (
        <div className="mt-1 flex items-center gap-1.5 px-1 text-sm text-muted-foreground">
          <span>{tErrors("message_failed")}</span>
          <button
            type="button"
            onClick={() => onRetry?.(message.externalId ?? message.id)}
            className="font-medium text-primary underline underline-offset-2 transition-opacity hover:opacity-80"
          >
            {tErrors("resend")}
          </button>
        </div>
      )}
    </div>
  );
}
