"use client";

import { cn } from "@/src/lib/utils";
import { useInView } from "@/src/hooks/use-in-view";
import { useTranslations } from "next-intl";
import React from "react";
import { HomeCTA } from "@/src/components/home/home-cta";
import { PricingCard } from "@/src/components/shared/pricing-card";
import { TRIAL_DAYS } from "@/src/lib/constants";

export default function Pricing() {
  const t = useTranslations("home.pricing");
  const tPricing = useTranslations("pricing");
  const [ref, visible] = useInView();

  return (
    <section
      id="pricing"
      ref={ref as React.RefObject<HTMLDivElement>}
      className="bg-[#F5F5F7] dark:bg-[#1C1C1E] py-[120px] px-6 md:py-[80px] scroll-mt-24"
    >
      <div
        className={cn(
          "max-w-md mx-auto text-center transition-all duration-700",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        )}
      >
        <h2 className="text-[28px] sm:text-[34px] md:text-[38px] font-normal leading-tight mb-2">
          {t("block_title")}
        </h2>
        <p className="text-[15px] text-muted-foreground mb-8">
          {t("block_subtitle")}
        </p>

        <PricingCard
          topNote={tPricing("home_trial_note", { days: TRIAL_DAYS })}
          renderCta={() => (
            <HomeCTA
              waLabel={t("cta")}
              buttonClassName="w-full rounded-full h-12 font-semibold gap-2 text-base"
              isCtaAnchor
            />
          )}
        />
      </div>
    </section>
  );
}
