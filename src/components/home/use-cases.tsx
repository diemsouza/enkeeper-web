"use client";

import { Card } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";
import { useInView } from "@/src/hooks/use-in-view";
import { useTranslations } from "next-intl";
import React from "react";

const CARD_COUNT = 6;

export default function UseCases() {
  const t = useTranslations("home.who");
  const [ref, visible] = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        "section-light py-24 px-6 transition-all duration-700",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
      )}
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl sm:text-5xl font-bold text-center mb-16">
          {t("title")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: CARD_COUNT }, (_, i) => (
            <Card
              key={i}
              className="p-6 rounded-2xl border bg-card hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{t(`cards.${i}.emoji`)}</div>
              <h3 className="text-lg font-semibold mb-1">
                {t(`cards.${i}.title`)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(`cards.${i}.description`)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
