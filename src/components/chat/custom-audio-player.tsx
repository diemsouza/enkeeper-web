"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  NativeAudioPlayer,
  formatTime,
  type AudioPlayerProps,
} from "@/src/components/chat/native-audio-player";
import { AudioAvatar } from "@/src/components/chat/audio-avatar";
import { Spinner } from "@/src/components/ui/spinner";

// Mesma estrutura e altura do player enquanto o chunk do decoder carrega:
// a bolha nao cresce quando ele aparece.
function AudioPlayerPlaceholder(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1 py-1 w-[260px] md:w-[320px]">
      <div className="flex items-center gap-3">
        <span className="shrink-0 p-1">
          <span className="flex h-7 w-7 items-center justify-center">
            <Spinner className="border-current" />
          </span>
        </span>
        <div className="flex-1 h-6 min-w-0" />
        <AudioAvatar />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-9 shrink-0" aria-hidden="true" />
        <span className="select-none text-chat-meta opacity-60 tabular-nums">
          {formatTime(0)}
        </span>
      </div>
    </div>
  );
}

const OggAudioPlayer = dynamic(
  () =>
    import("@/src/components/chat/ogg-audio-player").then(
      (m) => m.OggAudioPlayer,
    ),
  { ssr: false, loading: AudioPlayerPlaceholder },
);

const OGG_OPUS_TYPE = 'audio/ogg; codecs="opus"';

// O Safari so toca Ogg/Opus nativo a partir do iOS/macOS 18.4; antes disso
// o decoder via Web Audio (OggAudioPlayer) e o fallback.
function canPlayOggNatively(): boolean {
  return document.createElement("audio").canPlayType(OGG_OPUS_TYPE) !== "";
}

export function CustomAudioPlayer({
  audioContentType,
  ...props
}: AudioPlayerProps & { audioContentType?: string }) {
  const [isUnsupported, setIsUnsupported] = useState(false);
  const isOgg =
    audioContentType?.includes("ogg") || props.audioUrl.endsWith(".ogg");

  useEffect(() => {
    if (isOgg && !canPlayOggNatively()) setIsUnsupported(true);
  }, [isOgg]);

  return isUnsupported ? (
    <OggAudioPlayer {...props} />
  ) : (
    <NativeAudioPlayer
      {...props}
      onUnsupported={() => setIsUnsupported(true)}
    />
  );
}
