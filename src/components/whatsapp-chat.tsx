"use client";

import { WhatsAppText } from "./shared/whatsapp-text";

interface Message {
  from: "user" | "bot";
  text?: string;
  time: string;
  type?: "file";
  fileName?: string;
  fileSize?: string;
}

function FileCard({ fileName, fileSize }: { fileName: string; fileSize: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center shrink-0">
        <span className="text-white text-[10px] font-bold tracking-wide">PDF</span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[13px] leading-tight">{fileName}</p>
        <p className="text-[11px] opacity-50 mt-0.5">{fileSize}</p>
      </div>
    </div>
  );
}

export function WhatsAppChat({ messages }: { messages: Message[] }) {
  return (
    <div className="bg-[#EBE5DC] dark:bg-[#0B141A] md:rounded-[20px] p-4 w-full md:w-[480px] flex flex-col gap-1.5">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={
            msg.from === "user" ? "flex justify-end" : "flex justify-start"
          }
        >
          <div
            className={
              msg.from === "user"
                ? "bg-[#DCF8C6] dark:bg-[#005C4B] text-[#1a1a1a] dark:text-[#e9edef] rounded-[10px_10px_2px_10px] px-3 pt-2 pb-1.5 text-[13.5px] max-w-[70%]"
                : "bg-white dark:bg-[#202C33] text-[#1a1a1a] dark:text-[#e9edef] border border-black/[0.08] rounded-[10px_10px_10px_2px] px-3 pt-2 pb-1.5 text-[13.5px] max-w-[70%]"
            }
          >
            {msg.type === "file" ? (
              <FileCard fileName={msg.fileName!} fileSize={msg.fileSize!} />
            ) : (
              <p className="whitespace-pre-line leading-[1.5]">
                <WhatsAppText text={msg.text ?? ""} />
              </p>
            )}
            <p className="text-[10.5px] opacity-55 mt-0.5 text-right">
              {msg.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
