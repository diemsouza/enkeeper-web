import { ExternalLink } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { FormattedMessage } from "@/src/types/out-message";
import type { FormattedMessageButton } from "./types";

type Interactive = NonNullable<FormattedMessage["interactive"]>;

export function InteractiveButtonList({
  interactive,
  onButtonClick,
}: {
  interactive: Interactive;
  onButtonClick?: (button: FormattedMessageButton) => void;
}) {
  if (interactive.isOptionList) {
    return (
      <OptionList interactive={interactive} onButtonClick={onButtonClick} />
    );
  }

  return (
    <div className="-mx-3 mt-2 border-t border-black/10 dark:border-white/10">
      {interactive.buttons.map((button, i) => {
        const rowClassName = cn(
          "flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-[15px] md:text-[14px] font-medium text-primary transition-colors hover:bg-black/5 dark:hover:bg-white/5 min-h-11",
          i > 0 && "border-t border-black/10 dark:border-white/10",
        );
        if (button.type === "link" && button.url) {
          return (
            <a
              key={button.id}
              href={button.url}
              target="_blank"
              rel="noopener noreferrer"
              className={rowClassName}
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              {button.label}
            </a>
          );
        }
        return (
          <button
            key={button.id}
            type="button"
            onClick={() => onButtonClick?.(button)}
            className={rowClassName}
          >
            {button.label}
          </button>
        );
      })}
    </div>
  );
}

function OptionList({
  interactive,
  onButtonClick,
}: {
  interactive: Interactive;
  onButtonClick?: (button: FormattedMessageButton) => void;
}) {
  const isDisabled = Boolean(interactive.disabled);

  return (
    <div
      role="radiogroup"
      aria-label={interactive.body}
      aria-disabled={isDisabled || undefined}
      className="-mx-3 mt-2 flex flex-col gap-1.5 px-[10px] pb-1"
    >
      {interactive.buttons.map((button) => {
        const isSelected = button.id === interactive.selectedId;
        return (
          <button
            key={button.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isDisabled}
            onClick={() => onButtonClick?.(button)}
            className={cn(
              "flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[15px] md:text-[14px] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              !isDisabled &&
                "border-border hover:border-primary dark:border-white/[0.03] dark:bg-white/[0.03] dark:hover:border-primary",
              isDisabled &&
                !isSelected &&
                "cursor-default border-border/60 bg-transparent text-muted-foreground opacity-50 dark:border-white/10",
              isSelected &&
                "cursor-default border-foreground/20 bg-foreground/[0.04] text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                isSelected
                  ? "border-foreground/50"
                  : "border-muted-foreground/50",
              )}
            >
              {isSelected && (
                <span className="h-2 w-2 rounded-full bg-foreground/60" />
              )}
            </span>
            <span className="min-w-0 break-words">{button.label}</span>
          </button>
        );
      })}
    </div>
  );
}
