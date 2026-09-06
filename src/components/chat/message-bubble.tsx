import { useState } from "react";
import { cn } from "@/src/lib/utils";
import { AudioCard } from "./audio-card";
import { FileCard } from "./file-card";
import { ImageBubble } from "./image-bubble";
import { InteractiveButtonList } from "./interactive-buttons";
import { TextBubble } from "./text-bubble";
import type { FormattedMessageButton, Message } from "./types";
import { VoiceNoteCard } from "./voice-note-card";

export function MessageBubble({
  message,
  isNew,
  onAudioPlay,
  onButtonClick,
}: {
  message: Message;
  isNew?: boolean;
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
        isUser ? "flex justify-end" : "flex justify-start",
      )}
    >
      <div
        className={cn(
          isUser
            ? "bg-primary text-primary-foreground rounded-[10px_10px_2px_10px]"
            : "bg-white text-foreground dark:bg-[#1C1C1E] rounded-[10px_10px_10px_2px]",
          "px-3 pt-2 pb-1.5 text-[15px] md:text-[14px]",
          message.type === "file" ||
            message.type === "voice" ||
            message.interactive
            ? "max-w-[85%] md:max-w-[70%]"
            : "max-w-[70%]",
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
          <AudioCard
            audioUrl={message.audioUrl!}
            externalId={message.externalId}
            onPlay={onAudioPlay}
          />
        ) : message.type === "voice" ? (
          <VoiceNoteCard duration={message.duration ?? ""} />
        ) : (
          <TextBubble text={message.interactive?.body ?? message.text ?? ""} />
        )}
        <p className="text-[10.5px] opacity-55 mt-0.5 text-right">
          {message.time}
        </p>
        {message.interactive && (
          <InteractiveButtonList
            buttons={message.interactive.buttons}
            onButtonClick={onButtonClick}
          />
        )}
      </div>
    </div>
  );
}
