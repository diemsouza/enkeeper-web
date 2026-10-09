"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  NativeAudioPlayer,
  type AudioPlayerProps,
} from "@/src/components/chat/native-audio-player";

const OggAudioPlayer = dynamic(
  () =>
    import("@/src/components/chat/ogg-audio-player").then(
      (m) => m.OggAudioPlayer,
    ),
  { ssr: false },
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
