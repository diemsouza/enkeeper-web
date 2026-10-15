"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { IntervalToggle } from "@/src/components/shared/interval-toggle";
import {
  SUBSCRIPTION_INTERVAL,
  SubscriptionInterval,
} from "@/src/lib/constants";
import { getPricingDisplay } from "@/src/lib/pricing-display";

const BENEFIT_COUNT = 4;

export function PricingCard({
  topNote,
  lockedInterval,
  renewNote,
  renderCta,
}: {
  topNote?: ReactNode;
  lockedInterval?: SubscriptionInterval;
  renewNote?: ReactNode;
  renderCta: (interval: SubscriptionInterval) => ReactNode;
}) {
  const t = useTranslations("pricing");
  const pricing = getPricingDisplay();
  const [interval, setInterval] = useState<SubscriptionInterval>(
    lockedInterval ?? SUBSCRIPTION_INTERVAL.YEARLY,
  );

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-white dark:bg-[#1C1C1E] p-8 md:p-10 shadow-lg">
      {topNote && (
        <p className="mb-6 text-sm font-medium text-primary">{topNote}</p>
      )}

      <IntervalToggle
        value={interval}
        isLocked={Boolean(lockedInterval)}
        onChange={setInterval}
      />

      <div hidden={interval !== SUBSCRIPTION_INTERVAL.YEARLY}>
        <p className="mb-1">
          <span className="text-5xl font-bold">
            {t("yearly.price", pricing)}
          </span>{" "}
          <span className="text-sm text-muted-foreground">
            {t("price_suffix")}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t("yearly.billed", pricing)}
        </p>
        <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {t("yearly.savings", pricing)}
        </span>
      </div>
      <p hidden={interval !== SUBSCRIPTION_INTERVAL.MONTHLY} className="mb-1">
        <span className="text-5xl font-bold">
          {t("monthly.price", pricing)}
        </span>{" "}
        <span className="text-sm text-muted-foreground">
          {t("price_suffix")}
        </span>
      </p>
      <p className="mt-2 text-sm text-muted-foreground mb-8">
        {renewNote ?? t("renew_note")}
      </p>

      <ul className="text-left flex flex-col gap-3 mb-8">
        {Array.from({ length: BENEFIT_COUNT }, (_, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <Check
              className="w-5 h-5 shrink-0 text-primary"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span>{t(`benefits.${i}`)}</span>
          </li>
        ))}
      </ul>

      {renderCta(interval)}
    </div>
  );
}
