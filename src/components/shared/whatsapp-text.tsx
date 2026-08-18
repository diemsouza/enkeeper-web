import { Fragment } from "react";

interface WhatsAppTextProps {
  text: string;
}

export function WhatsAppText({ text }: WhatsAppTextProps) {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        const formatted = line
          .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
          .replace(/_([^_]+)_/g, "<em>$1</em>")
          .replace(/~([^~]+)~/g, "<s>$1</s>")
          .replace(
            /`([^`]+)`/g,
            '<code class="bg-[#dfe5e7] text-[#111b21] dark:bg-[#344047] dark:text-[#e9edef] font-mono text-[13px] px-1 py-0.5 rounded-[4px] whitespace-pre-wrap break-words">$1</code>',
          )
          .replace(
            /```([^`]+)```/g,
            '<code class="bg-[#dfe5e7] text-[#111b21] dark:bg-[#344047] dark:text-[#e9edef] font-mono text-[13px] px-1 py-0.5 rounded-[4px] whitespace-pre-wrap break-words">$1</code>',
          );

        return (
          <Fragment key={i}>
            <span dangerouslySetInnerHTML={{ __html: formatted }} />
            {i < lines.length - 1 && <br />}
          </Fragment>
        );
      })}
    </>
  );
}
