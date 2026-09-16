"use client";

import { cn } from "@/src/lib/utils";
import { useInView } from "@/src/hooks/use-in-view";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import React from "react";
import { HomeCTA } from "@/src/components/home/home-cta";
import { TRIAL_DAYS } from "@/src/lib/constants";

const BENEFIT_COUNT = 6;

export default function Pricing() {
  const t = useTranslations("home.pricing");
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
          {t("block_subtitle", { days: TRIAL_DAYS })}
        </p>

        <div className="rounded-2xl border-2 border-primary/20 bg-white dark:bg-[#1C1C1E] p-8 md:p-10 shadow-lg">
          <p className="mb-1">
            <span className="text-5xl font-bold">{t("price")}</span>{" "}
            <span className="text-sm text-muted-foreground">
              {t("price_suffix")}
            </span>
          </p>
          <p className="text-xs text-muted-foreground mb-8">
            {t("price_note")}
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

          <HomeCTA
            waLabel={t("cta")}
            buttonClassName="w-full rounded-full h-12 font-semibold gap-2 text-base"
          />
        </div>
      </div>
    </section>
  );
}
