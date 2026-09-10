"use client";

import { useLocale } from "next-intl";
import { formatDayLabel } from "@/src/lib/datetime-utils";

export function DateSeparator({ date }: { date: string }) {
  const locale = useLocale();

  return (
    <div className="flex justify-center py-1">
      <span className="rounded-md bg-white px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm dark:bg-[#1C1C1E]">
        {formatDayLabel(date, locale)}
      </span>
    </div>
  );
}
