"use client";

import { forwardRef } from "react";
import { MessageBubble } from "@/src/components/chat/message-bubble";
import { Composer } from "@/src/components/chat/composer";
import type { Message } from "@/src/components/chat/types";
import {
  generatePentagonChartSvg,
  type PentagonChartInput,
} from "@/src/core/pentagon-chart";

type SimulatorThreadPanelProps = {
  messages: Message[];
  summary: { text: string; time: string };
  pentagon: { input: PentagonChartInput; time: string };
  onScroll: () => void;
  size?: "default" | "compact";
};

function pentagonImageUrl(input: PentagonChartInput): string {
  const svg = generatePentagonChartSvg(input);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SimulatorThreadPanel = forwardRef<
  HTMLDivElement,
  SimulatorThreadPanelProps
>(function SimulatorThreadPanel(
  { messages, summary, pentagon, onScroll, size = "default" },
  ref,
) {
  const compact = size === "compact";

  const content = (
    <div className="flex h-full min-h-0 flex-col bg-[#F5F5F7] dark:bg-[#1C1C1E]">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-[url('/images/wa-background.svg')] bg-repeat opacity-[0.06] dark:opacity-[0.05] dark:invert"
        /> */}
        <div
          ref={ref}
          onScroll={onScroll}
          className="relative z-10 flex h-full flex-col gap-1.5 overflow-y-auto p-4"
        >
          <div className="mx-auto flex w-full max-w-md flex-col gap-3 pb-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                wide={compact}
              />
            ))}
            <MessageBubble
              wide={compact}
              zoomDisabled
              message={{
                id: "summary",
                from: "bot",
                time: summary.time,
                type: "image",
                imageUrl: pentagonImageUrl(pentagon.input),
                caption: summary.text,
              }}
            />
          </div>
        </div>
      </div>
      <Composer onSend={() => {}} disabled />
    </div>
  );

  if (!compact) return content;

  return (
    <div className="h-full w-full overflow-hidden">
      <div
        style={{
          transform: "scale(0.72)",
          transformOrigin: "top left",
          width: "138.889%",
          height: "138.889%",
        }}
      >
        {content}
      </div>
    </div>
  );
});
