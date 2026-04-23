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
          .replace(/```([^`]+)```/g, "<code>$1</code>");

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
