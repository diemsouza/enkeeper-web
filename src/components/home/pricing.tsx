"use client";

import { cn } from "@/src/lib/utils";
import { useInView } from "@/src/hooks/use-in-view";
import { useTranslations } from "next-intl";
import React from "react";
import { HomeCTA } from "@/src/components/home/home-cta";
import { TRIAL_DAYS } from "@/src/lib/constants";

export default function Pricing() {
  const t = useTranslations("home.pricing");
  const [ref, visible] = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLDivElement>}
      className="bg-[#F5F5F7] dark:bg-[#1C1C1E] py-[120px] px-6 md:py-[80px]"
    >
      <div
        className={cn(
          "max-w-[680px] mx-auto text-center transition-all duration-700",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        )}
      >
        <h2 className="text-[32px] sm:text-[42px] font-[600] mb-4 leading-tight">
          {t("title")}
        </h2>
        <p className="text-[18px] text-muted-foreground mb-6">
          {t("subtitle", { days: TRIAL_DAYS })}
        </p>
        <p className="text-[17px] text-muted-foreground leading-[1.7] mb-10">
          {t("description")}
        </p>
        <HomeCTA
          waLabel={t("cta")}
          buttonClassName="rounded-full px-10 h-12 font-semibold gap-2 text-base"
        />
      </div>
    </section>
  );
}
