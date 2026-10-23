"use client";

import { Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  forwardRef,
  KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { type Command, searchAutoCompleteCommands } from "@/src/lib/commands";
import { capitalizeFirst } from "@/src/lib/utils";
import { canRecordVoice } from "@/src/lib/voice-recording";
import { useToast } from "@/src/hooks/use-toast";
import {
  useVoiceRecorder,
  type VoiceCaptureError,
} from "@/src/hooks/use-voice-recorder";
import { RecordingBar } from "@/src/components/chat/recording-bar";
import {
  ComposerActionButton,
  type ComposerActionRole,
} from "@/src/components/chat/composer-action-button";
import { useHoldToRecord } from "@/src/hooks/use-hold-to-record";
import { MicPermissionDialog } from "@/src/components/chat/mic-permission-dialog";

const COMPOSER_MAX_ROWS = 4;

const CAPTURE_ERROR_KEYS: Record<VoiceCaptureError, string> = {
  not_found: "mic_not_found",
  in_use: "mic_in_use",
  generic: "mic_generic",
};

const COMPOSER_BACKDROP_MASK =
  "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.85) 100%)";

export type ComposerHandle = {
  focus: () => void;
};

type ComposerProps = {
  onSend: (text: string) => void | Promise<void>;
  onSendFile?: (file: File) => void | Promise<void>;
  onSendAudio?: (recording: Blob) => void | Promise<void>;
  disabled?: boolean;
  disabledReason?: string;
  isWaitingForResponse?: boolean;
};

export const Composer = forwardRef<ComposerHandle, ComposerProps>(
  function Composer(
    {
      onSend,
      onSendFile,
      onSendAudio,
      disabled,
      disabledReason,
      isWaitingForResponse,
    },
    ref,
  ) {
    const t = useTranslations("app.chat");
    const tErrors = useTranslations("app.errors");
    const { toast } = useToast();
    const [canRecord, setCanRecord] = useState(false);
    const recorder = useVoiceRecorder({
      onRecorded: (recording) => void onSendAudio?.(recording),
      onCaptureError: (error) =>
        toast({ description: tErrors(CAPTURE_ERROR_KEYS[error]) }),
    });
    const isRecording = recorder.status === "recording";
    const hold = useHoldToRecord({
      status: recorder.status,
      start: recorder.start,
      finish: recorder.finish,
      resumeAudio: recorder.resumeAudio,
    });
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

    useLayoutEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const style = getComputedStyle(textarea);
      const maxHeight =
        parseFloat(style.lineHeight) * COMPOSER_MAX_ROWS +
        parseFloat(style.paddingTop) +
        parseFloat(style.paddingBottom) +
        parseFloat(style.borderTopWidth) +
        parseFloat(style.borderBottomWidth);
      textarea.style.height = "auto";
      const contentHeight =
        textarea.scrollHeight +
        parseFloat(style.borderTopWidth) +
        parseFloat(style.borderBottomWidth);
      textarea.style.height = `${Math.min(contentHeight, maxHeight)}px`;
      textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
    }, [text]);

    useEffect(() => {
      setCanRecord(!!onSendAudio && canRecordVoice());
    }, [onSendAudio]);

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
      textareaRef.current?.blur();
      await onSend(trimmed);
    }

    const actionRole: ComposerActionRole = hold.isHolding
      ? "hold"
      : isRecording
        ? "locked"
        : canRecord && !text
          ? "mic"
          : "send";

    const isActionDisabled =
      actionRole === "send"
        ? !text.trim() || !!disabled || !!isWaitingForResponse
        : actionRole === "mic" && (!!disabled || !!isWaitingForResponse);

    function handleActionPointerDown(
      event: ReactPointerEvent<HTMLButtonElement>,
    ) {
      if (actionRole === "mic" && !isActionDisabled) {
        hold.handlers.onPointerDown(event);
      }
    }

    // Pelo ponteiro o mic ja comecou no pointerdown; o click sem ponteiro
    // (teclado, detail 0) grava no modo travado.
    function handleActionClick(event: ReactMouseEvent<HTMLButtonElement>) {
      if (hold.shouldIgnoreClick()) return;
      if (actionRole === "mic" && event.detail === 0) recorder.start();
      if (actionRole === "locked") recorder.finish();
      if (actionRole === "send") void handleSend();
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
      <div className="relative">
        {/* Fundo desfocado do footer, atrás de tudo. Usa a mesma cor do fundo
            do chat (thread.tsx) para o efeito só aparecer sobre as mensagens
            que passam por trás, sem mudar as laterais vazias. Rampa contínua:
            nasce transparente no topo e fica mais opaca até o fim. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[#F5F5F7] backdrop-blur-sm dark:bg-[#1C1C1E]"
          style={{
            maskImage: COMPOSER_BACKDROP_MASK,
            WebkitMaskImage: COMPOSER_BACKDROP_MASK,
          }}
        />
        <div
          className="flex flex-col gap-1 px-3 pt-2"
          style={{
            paddingBottom:
              "max(0.75rem, calc(env(safe-area-inset-bottom) - 0.75rem))",
          }}
        >
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
            {isRecording && recorder.isWarning && (
              <div className="pointer-events-none absolute inset-x-0 bottom-full z-30 mb-2 flex justify-center">
                <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white shadow-sm">
                  {t("voice.time_warning")}
                </span>
              </div>
            )}
            <div className="pointer-events-auto flex w-full items-end gap-1.5 rounded-3xl border border-border bg-background/70 backdrop-blur-xl backdrop-saturate-150 px-1.5 py-1 shadow-sm">
              {isRecording ? (
                <RecordingBar
                  mode={hold.isHolding ? "hold" : "locked"}
                  elapsedMs={recorder.elapsedMs}
                  levels={recorder.levels}
                  isWarning={recorder.isWarning}
                  onCancel={recorder.cancel}
                />
              ) : (
                <>
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
                    aria-label={t("attach_file_aria")}
                    title={t("attach_file_title")}
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
                      disabled
                        ? (disabledReason ?? t("placeholder_archived"))
                        : t("placeholder_default")
                    }
                    className="min-h-9 flex-1 resize-none rounded-2xl border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </>
              )}
              <ComposerActionButton
                role={actionRole}
                disabled={isActionDisabled}
                onClick={handleActionClick}
                onPointerDown={handleActionPointerDown}
                onPointerUp={hold.handlers.onPointerUp}
                onPointerCancel={hold.handlers.onPointerCancel}
                onLostPointerCapture={hold.handlers.onLostPointerCapture}
                onContextMenu={hold.handlers.onContextMenu}
              />
            </div>
          </div>
        </div>
        <MicPermissionDialog
          open={recorder.status === "denied"}
          onConfirm={recorder.dismissDenied}
          onAfterClose={() => textareaRef.current?.focus()}
        />
      </div>
    );
  },
);
