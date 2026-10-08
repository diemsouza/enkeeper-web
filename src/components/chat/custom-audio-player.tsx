"use client";

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

export function CustomAudioPlayer({
  audioContentType,
  ...props
}: AudioPlayerProps & { audioContentType?: string }) {
  const isOgg =
    audioContentType?.includes("ogg") || props.audioUrl.endsWith(".ogg");
  return isOgg ? (
    <OggAudioPlayer {...props} />
  ) : (
    <NativeAudioPlayer {...props} />
  );
}
