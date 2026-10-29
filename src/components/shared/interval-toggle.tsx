"use client";

import { useTranslations } from "next-intl";
import {
  SUBSCRIPTION_INTERVAL,
  SubscriptionInterval,
} from "@/src/lib/constants";
import { SegmentedControl } from "./segmented-control";

const INTERVAL_OPTIONS: SubscriptionInterval[] = [
  SUBSCRIPTION_INTERVAL.YEARLY,
  SUBSCRIPTION_INTERVAL.MONTHLY,
];

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

  return (
    <SegmentedControl
      options={INTERVAL_OPTIONS.map((interval) => ({
        value: interval,
        label: t(`toggle.${interval}`),
      }))}
      value={value}
      onChange={onChange}
      isOptionDisabled={(interval) => isLocked && value !== interval}
      className="mx-auto mb-6 w-fit"
      optionClassName="px-5"
    />
  );
}
