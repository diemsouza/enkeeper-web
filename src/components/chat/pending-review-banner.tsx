"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

// Linha da bandeja do composer. Guarda a ultima contagem para a linha
// descer com o numero ainda visivel quando as revisoes zeram.
export function PendingReviewBanner({
  count,
  onPractice,
}: {
  count: number;
  onPractice: () => void;
}): React.ReactElement {
  const t = useTranslations("app.chat");
  const [shownCount, setShownCount] = useState(count);
  if (count > 0 && count !== shownCount) setShownCount(count);

  return (
    <button
      type="button"
      onClick={onPractice}
      className="flex min-h-touch w-full items-center gap-2 px-1.5 text-left"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
        {shownCount}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {t("pending_review.label")}
      </span>
      <span className="flex shrink-0 items-center gap-0.5 text-[15px] font-semibold text-primary">
        {t("pending_review.cta")}
        <ChevronRight className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}
