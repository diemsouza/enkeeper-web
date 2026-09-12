"use client";

import { cn } from "@/src/lib/utils";
import { MessageBubble } from "@/src/components/chat/message-bubble";
import type { Message } from "@/src/components/chat/types";

type RawMsg = {
  from: "user" | "bot";
  text?: string;
  time: string;
  type?: "file" | "voice";
  fileName?: string;
  fileSize?: string;
  duration?: string;
};

export function ChatPreview({
  messages,
  widthClassName = "w-full md:w-[480px]",
  maxHeightClassName,
}: {
  messages: RawMsg[];
  widthClassName?: string;
  maxHeightClassName?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[#F5F5F5] dark:bg-black rounded-[20px] shadow-lg relative overflow-hidden flex flex-col",
        widthClassName,
        maxHeightClassName,
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[url('/images/wa-background.svg')] bg-repeat opacity-[0.06] dark:opacity-[0.05] dark:invert" />
      <div className="relative z-10 w-full h-full p-4 flex flex-col gap-1.5 overflow-y-auto scrollbar-hide">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={{ id: String(i), ...msg } satisfies Message}
          />
        ))}
      </div>
    </div>
  );
}
