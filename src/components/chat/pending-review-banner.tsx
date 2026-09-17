"use client";

import { useTranslations } from "next-intl";

export function PendingReviewBanner({
  count,
  onPractice,
}: {
  count: number;
  onPractice: () => void;
}): React.ReactElement | null {
  const t = useTranslations("app.chat");

  if (count === 0) return null;

  return (
    <div className="pointer-events-auto mx-auto flex w-full max-w-3xl items-center gap-2 rounded-3xl border border-primary/20 bg-primary/15 px-3 py-2 backdrop-blur-xl backdrop-saturate-150 dark:bg-primary/20">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
        {count}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-foreground">
        {t("pending_review.label")}
      </p>
      <button
        type="button"
        onClick={onPractice}
        className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90"
      >
        {t("pending_review.cta")}
      </button>
    </div>
  );
}
