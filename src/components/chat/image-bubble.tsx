"use client";

import Zoom from "react-medium-image-zoom";
import { useTranslations } from "next-intl";
import { WhatsAppText } from "@/src/components/shared/whatsapp-text";

export function ImageBubble({
  imageUrl,
  caption,
  zoomDisabled = false,
}: {
  imageUrl: string;
  caption?: string;
  zoomDisabled?: boolean;
}) {
  const t = useTranslations("app.chat");
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt="Chat image"
      className="block -mx-3 -mt-2 w-[calc(100%_+_1.5rem)] max-w-none"
    />
  );
  return (
    <div className="flex flex-col">
      {zoomDisabled ? (
        image
      ) : (
        <Zoom a11yNameButtonZoom={t("zoom_image_aria")}>{image}</Zoom>
      )}
      {caption && (
        <p className="whitespace-pre-line leading-[1.5] break-words mt-2">
          <WhatsAppText text={caption} />
        </p>
      )}
    </div>
  );
}
