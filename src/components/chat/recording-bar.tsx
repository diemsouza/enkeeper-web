"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatTime } from "@/src/components/chat/native-audio-player";
import { WaveformBars } from "@/src/components/chat/waveform-bars";
import { cn } from "@/src/lib/utils";

type RecordingBarProps = {
  // hold: segurar para falar, sem lixeira (o soltar e o enviar).
  mode: "locked" | "hold";
  elapsedMs: number;
  levels: number[];
  isWarning: boolean;
  onCancel: () => void;
};

export function RecordingBar({
  mode,
  elapsedMs,
  levels,
  isWarning,
  onCancel,
}: RecordingBarProps): React.JSX.Element {
  const t = useTranslations("app.chat.voice");
  return (
    <div
      className={cn(
        "flex h-[var(--composer-field)] min-w-0 flex-1 items-center gap-1.5",
        mode === "hold" && "pl-3",
      )}
      role="status"
      aria-label={t("recording_aria")}
    >
      {mode === "locked" && (
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("discard_aria")}
          className="touch-target flex h-composer w-composer shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
        >
          <Trash2 className="h-composer-icon w-composer-icon" />
        </button>
      )}
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500"
      />
      <span
        className={cn(
          "w-10 shrink-0 text-sm tabular-nums",
          isWarning ? "text-orange-500" : "text-foreground",
        )}
      >
        {formatTime(elapsedMs / 1000)}
      </span>
      <WaveformBars
        heights={levels}
        barOpacity={0.85}
        className="h-6 min-w-0 flex-1 text-foreground"
      />
    </div>
  );
}
