"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/src/lib/utils";
import {
  SUBSCRIPTION_INTERVAL,
  SubscriptionInterval,
} from "@/src/lib/constants";

const INTERVAL_OPTIONS: SubscriptionInterval[] = [
  SUBSCRIPTION_INTERVAL.YEARLY,
  SUBSCRIPTION_INTERVAL.MONTHLY,
];

// Cores fixas (sem bg-muted/bg-background) para o alternador ficar igual no
// site e no app, independente do tema da página.
export function IntervalToggle({
  value,
  isLocked,
  onChange,
}: {
  value: SubscriptionInterval;
  isLocked: boolean;
  onChange: (interval: SubscriptionInterval) => void;
}) {
  const t = useTranslations("pricing");
  const selectedIndex = INTERVAL_OPTIONS.indexOf(value);

  return (
    <div
      role="radiogroup"
      className="relative mx-auto mb-6 grid w-fit grid-cols-2 rounded-full bg-black/5 p-1 dark:bg-white/10"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out dark:bg-[#3A3A3C]"
        style={{ transform: `translateX(${selectedIndex * 100}%)` }}
      />
      {INTERVAL_OPTIONS.map((interval) => (
        <button
          key={interval}
          type="button"
          role="radio"
          aria-checked={value === interval}
          disabled={isLocked && value !== interval}
          onClick={() => onChange(interval)}
          className={cn(
            "relative z-10 h-8 px-5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            value === interval
              ? "font-semibold text-foreground"
              : "font-medium text-muted-foreground enabled:hover:text-foreground",
          )}
        >
          {t(`toggle.${interval}`)}
        </button>
      ))}
    </div>
  );
}
