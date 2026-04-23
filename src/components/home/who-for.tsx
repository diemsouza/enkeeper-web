"use client";

import { cn } from "@/src/lib/utils";
import { useInView } from "@/src/hooks/use-in-view";
import { useTranslations } from "next-intl";
import {
  Languages,
  BookOpen,
  Briefcase,
  Plane,
  MonitorPlay,
  Sparkles,
} from "lucide-react";
import React from "react";

const CARD_COUNT = 6;
const CARD_ICONS = [
  Languages,
  BookOpen,
  Briefcase,
  MonitorPlay,
  Plane,
  Sparkles,
] as const;

export default function WhoFor() {
  const t = useTranslations("home.who");
  const [ref, visible] = useInView();

  return (
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
          <h2 className="text-[40px] sm:text-[48px] lg:text-[52px] font-[600] leading-tight mb-4">
            {t("title")}
          </h2>
          <p className="text-[17px] text-muted-foreground max-w-xl mx-auto leading-[1.7]">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: CARD_COUNT }, (_, i) => (
            <div
              key={i}
              style={{ transitionDelay: visible ? `${i * 100}ms` : "0ms" }}
              className={cn(
                "rounded-2xl border border-border bg-white dark:bg-[#2C2C2E] p-7",
                "shadow-sm hover:shadow-md hover:-translate-y-0.5",
                "transition-all duration-700 cursor-default",
                "opacity-0 translate-y-5",
                visible && "opacity-100 translate-y-0",
              )}
            >
              {React.createElement(CARD_ICONS[i], {
                className: "w-8 h-8 mb-4 text-muted-foreground",
                strokeWidth: 1.5,
              })}
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
  );
}
