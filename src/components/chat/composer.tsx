"use client";

import { ArrowUp, Paperclip } from "lucide-react";
import {
  forwardRef,
  KeyboardEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";

export type ComposerHandle = {
  focus: () => void;
};

type ComposerProps = {
  onSend: (text: string) => void | Promise<void>;
  onSendFile?: (file: File) => void | Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  isWaitingForResponse?: boolean;
};

export const Composer = forwardRef<ComposerHandle, ComposerProps>(
  function Composer(
    { onSend, onSendFile, disabled, disabledReason, isWaitingForResponse },
    ref,
  ) {
    const [text, setText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    async function handleSend() {
      const trimmed = text.trim();
      if (!trimmed || disabled || isWaitingForResponse) return;
      setText("");
      await onSend(trimmed);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (e.target) e.target.value = "";
      if (file) void onSendFile?.(file);
    }

    return (
      <div
        className="flex flex-col gap-1 px-3 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
      >
        {disabled && disabledReason && (
          <p className="text-center text-xs text-muted-foreground">
            {disabledReason}
          </p>
        )}
        <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-1.5 rounded-3xl border border-border bg-background/70 backdrop-blur-xl backdrop-saturate-150 px-1.5 py-1 shadow-sm">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,application/pdf,text/plain,text/markdown,.txt,.md"
            className="hidden"
          />
          <button
            type="button"
            disabled={disabled || isWaitingForResponse || !onSendFile}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Anexar arquivo"
            title="Enviar imagem, PDF ou texto"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <Textarea
            id="input_text"
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              disabled ? "Atividade arquivada" : "Digite sua mensagem..."
            }
            className="max-h-40 min-h-9 flex-1 resize-none rounded-2xl border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void handleSend()}
            disabled={!text.trim() || disabled || isWaitingForResponse}
            className="h-9 w-9 shrink-0 rounded-full"
            aria-label="Enviar"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  },
);
