import type { CSSProperties } from "react";
import { cn } from "@/src/lib/utils";

export const WAVEFORM_BARS = 40;
const WAVEFORM_IDLE_HEIGHT = 0.15;
const WAVEFORM_MAX_PX = 22;
const WAVEFORM_MIN_PX = 3;

type WaveformBarsProps = {
  heights: number[];
  className?: string;
  style?: CSSProperties;
  barClassName?: string;
  barOpacity?: number | ((index: number) => number);
};

export function WaveformBars({
  heights,
  className,
  style,
  barClassName,
  barOpacity,
}: WaveformBarsProps): React.JSX.Element {
  const bars =
    heights.length > 0
      ? heights
      : new Array<number>(WAVEFORM_BARS).fill(WAVEFORM_IDLE_HEIGHT);
  return (
    <div className={cn("flex items-center gap-[2px]", className)} style={style}>
      {bars.map((height, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-full bg-current", barClassName)}
          style={{
            height: `${Math.max(WAVEFORM_MIN_PX, height * WAVEFORM_MAX_PX)}px`,
            opacity:
              typeof barOpacity === "function" ? barOpacity(i) : barOpacity,
          }}
        />
      ))}
    </div>
  );
}
