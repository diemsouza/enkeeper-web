import { WhatsAppText } from "@/src/components/shared/whatsapp-text";

export function ImageBubble({
  imageUrl,
  caption,
}: {
  imageUrl: string;
  caption?: string;
}) {
  return (
    <div className="flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="block -mx-3 -mt-2 w-[calc(100%_+_1.5rem)] max-w-none"
      />
      {caption && (
        <p className="whitespace-pre-line leading-[1.5] break-words mt-2">
          <WhatsAppText text={caption} />
        </p>
      )}
    </div>
  );
}
