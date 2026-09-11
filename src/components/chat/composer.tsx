"use client";

import { ArrowUp, Paperclip } from "lucide-react";
import {
  forwardRef,
  KeyboardEvent,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { type Command, searchAutoCompleteCommands } from "@/src/lib/commands";
import { capitalizeFirst } from "@/src/lib/utils";

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
    const [activeIndex, setActiveIndex] = useState(0);
    const [menuDismissed, setMenuDismissed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    const commandQuery = text.startsWith("/") && !/\s/.test(text) ? text : null;
    const commandMatches =
      commandQuery !== null ? searchAutoCompleteCommands(commandQuery) : [];
    const showCommandMenu =
      !disabled && !menuDismissed && commandMatches.length > 0;
    const clampedActiveIndex = Math.min(
      activeIndex,
      Math.max(commandMatches.length - 1, 0),
    );

    useEffect(() => {
      setActiveIndex(0);
      if (commandQuery === null) setMenuDismissed(false);
    }, [commandQuery]);

    useEffect(() => {
      if (!showCommandMenu) return;
      function handlePointerDown(e: PointerEvent) {
        if (!containerRef.current?.contains(e.target as Node)) {
          setMenuDismissed(true);
        }
      }
      document.addEventListener("pointerdown", handlePointerDown);
      return () =>
        document.removeEventListener("pointerdown", handlePointerDown);
    }, [showCommandMenu]);

    async function handleSend() {
      const trimmed = text.trim();
      if (!trimmed || disabled || isWaitingForResponse) return;
      setText("");
      await onSend(trimmed);
    }

    function selectCommand(command: Command) {
      setText("");
      setMenuDismissed(true);
      setActiveIndex(0);
      textareaRef.current?.focus();
      void onSend(`/${command.display.toLocaleLowerCase()}`);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (showCommandMenu) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, commandMatches.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          selectCommand(commandMatches[clampedActiveIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setMenuDismissed(true);
          return;
        }
      }
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
        style={{
          paddingBottom:
            "max(0.75rem, calc(env(safe-area-inset-bottom) - 0.75rem))",
        }}
      >
        {disabled && disabledReason && (
          <p className="text-center text-xs text-muted-foreground">
            {disabledReason}
          </p>
        )}
        <div ref={containerRef} className="relative mx-auto w-full max-w-3xl">
          {showCommandMenu && (
            <div className="pointer-events-auto absolute inset-x-0 bottom-full z-30 mb-2 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-md">
              <ul
                className="overflow-y-auto py-1"
                style={{ maxHeight: "min(15rem, 40vh)" }}
              >
                {commandMatches.map((command, index) => (
                  <li key={command.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectCommand(command);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm ${
                        index === clampedActiveIndex
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }`}
                    >
                      <span className="font-medium whitespace-nowrap shrink-0">
                        {capitalizeFirst(command.display)}
                      </span>
                      <span className="ml-1.5 min-w-0 truncate text-muted-foreground">
                        - {command.description}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="pointer-events-auto flex w-full items-center gap-1.5 rounded-3xl border border-border bg-background/70 backdrop-blur-xl backdrop-saturate-150 px-1.5 py-1 shadow-sm">
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
      </div>
    );
  },
);
