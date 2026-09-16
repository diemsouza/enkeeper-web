"use client";

import { cn } from "@/src/lib/utils";
import { useInView } from "@/src/hooks/use-in-view";
import { useTranslations } from "next-intl";
import { MessageSquare, ShieldCheck, Brain } from "lucide-react";
import React from "react";
import { HomeCTA } from "@/src/components/home/home-cta";

const PRIMARY_ICONS = [MessageSquare, ShieldCheck, Brain] as const;
const SECONDARY_COUNT = 2;

export default function HowItWorksSection() {
  const t = useTranslations("home.how");
  const [ref, visible] = useInView();
  const [secondaryRef, secondaryVisible] = useInView();

  return (
    <>
      <section
        ref={ref as React.RefObject<HTMLDivElement>}
        className="section-light py-[120px] px-6 md:py-[80px]"
      >
        <div className="max-w-5xl mx-auto">
          <div
            className={cn(
              "text-center mb-16 transition-all duration-700",
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
            )}
          >
            <span className="inline-block rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              {t("badge")}
            </span>
            <h2 className="text-[28px] sm:text-[34px] md:text-[38px] font-normal leading-tight">
              {t("title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PRIMARY_ICONS.map((Icon, i) => (
              <div
                key={i}
                style={{ transitionDelay: visible ? `${i * 100}ms` : "0ms" }}
                className={cn(
                  "rounded-2xl border border-border bg-white dark:bg-[#2C2C2E] p-5 sm:p-7",
                  "shadow-sm hover:shadow-md hover:-translate-y-0.5",
                  "transition-all duration-700 cursor-default",
                  "opacity-0 translate-y-5",
                  visible && "opacity-100 translate-y-0",
                )}
              >
                <Icon
                  className="w-8 h-8 mb-4 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <h3 className="font-[600] text-[17px] mb-2">
                  {t(`cards.${i}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`cards.${i}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={secondaryRef as React.RefObject<HTMLDivElement>}
        className="section-dark py-[100px] px-6 md:py-[70px]"
      >
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
            {Array.from({ length: SECONDARY_COUNT }, (_, i) => (
              <div
                key={i}
                style={{
                  transitionDelay: secondaryVisible ? `${i * 100}ms` : "0ms",
                }}
                className={cn(
                  "rounded-2xl border border-border bg-white dark:bg-[#2C2C2E] p-5 sm:p-7",
                  "shadow-sm hover:shadow-md hover:-translate-y-0.5",
                  "transition-all duration-700 cursor-default",
                  "opacity-0 translate-y-5",
                  secondaryVisible && "opacity-100 translate-y-0",
                )}
              >
                <span className="block text-xs font-semibold uppercase tracking-wide text-primary mb-3">
                  {t(`secondary_cards.${i}.title`)}
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`secondary_cards.${i}.description`)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <HomeCTA
              waLabel={t("cta")}
              buttonClassName="rounded-full px-10 h-12 font-semibold gap-2 text-base"
            />
          </div>
        </div>
      </section>
    </>
  );
}
