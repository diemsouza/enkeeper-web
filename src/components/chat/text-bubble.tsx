import { WhatsAppText } from "@/src/components/shared/whatsapp-text";

export function TextBubble({ text }: { text: string }) {
  return (
    <p className="whitespace-pre-line leading-[1.5] break-words">
      <WhatsAppText text={text} />
    </p>
  );
}
