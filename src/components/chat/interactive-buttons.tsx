import { ExternalLink, Reply } from "lucide-react";
import { cn } from "@/src/lib/utils";
import type { FormattedMessageButton } from "./types";

export function InteractiveButtonList({
  buttons,
  onButtonClick,
}: {
  buttons: FormattedMessageButton[];
  onButtonClick?: (button: FormattedMessageButton) => void;
}) {
  return (
    <div className="-mx-3 mt-2 border-t border-black/10 dark:border-white/10">
      {buttons.map((button, i) => {
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
            <Reply className="w-3.5 h-3.5 shrink-0" />
            {button.label}
          </button>
        );
      })}
    </div>
  );
}
