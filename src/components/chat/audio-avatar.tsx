import { cn } from "@/src/lib/utils";

// O anel do selo do microfone tem a cor do fundo da bolha, para o selo
// parecer recortado nela.
export function AudioAvatar({
  isUserBubble,
}: {
  isUserBubble?: boolean;
}): React.JSX.Element {
  return (
    <div className="relative shrink-0">
      <div className="w-9 h-9 rounded-full bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 fill-neutral-100 dark:fill-neutral-900"
        >
          <rect x="3" y="9" width="2" height="6" rx="1" />
          <rect x="7" y="6" width="2" height="12" rx="1" />
          <rect x="11" y="3.5" width="2" height="17" rx="1" />
          <rect x="15" y="6" width="2" height="12" rx="1" />
          <rect x="19" y="9" width="2" height="6" rx="1" />
        </svg>
      </div>
      <div
        className={cn(
          "absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-neutral-700 dark:bg-neutral-300 flex items-center justify-center ring-2",
          isUserBubble ? "ring-primary" : "ring-white dark:ring-[#1C1C1E]",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="w-3 h-3 fill-neutral-100 dark:fill-neutral-900"
        >
          <path d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z" />
          <path d="M17 11a1 1 0 10-2 0 3 3 0 01-6 0 1 1 0 10-2 0 5 5 0 004 4.9V18H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.1a5 5 0 004-4.9z" />
        </svg>
      </div>
    </div>
  );
}
