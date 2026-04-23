"use client";

import { Card } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";
import { useInView } from "@/src/hooks/use-in-view";
import { Bookmark, MessageSquare, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

const STEP_ICONS = [MessageSquare, Bookmark, Search] as const;

export default function HowItWorks() {
  const t = useTranslations("home.how");
  const { ref, visible } = useInView();

  return (
    <section
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        "section-dark py-24 px-6 transition-all duration-700",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      )}
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl sm:text-5xl font-bold text-center mb-16">
          {t("title")}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEP_ICONS.map((Icon, i) => (
            <Card
              key={i}
              className="p-8 text-center rounded-2xl border-0 bg-background/60 shadow-sm"
            >
              <div className="flex justify-center mb-5">
                <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-2">
                {t(`steps.${i}.title`)}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t(`steps.${i}.description`)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
