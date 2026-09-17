"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/lib/utils";
import { HomeCTA } from "@/src/components/home/home-cta";

const PROXIMITY_MARGIN_PX = 150;

export default function FloatingCta() {
  const t = useTranslations("home.hero");
  const [ctaVisible, setCtaVisible] = useState(true);
  const visibilityRef = useRef(new Map<Element, boolean>());

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-cta-anchor]"),
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          visibilityRef.current.set(entry.target, entry.isIntersecting),
        );
        setCtaVisible(
          Array.from(visibilityRef.current.values()).some(Boolean),
        );
      },
      {
        rootMargin: `${PROXIMITY_MARGIN_PX}px 0px ${PROXIMITY_MARGIN_PX}px 0px`,
        threshold: 0,
      },
    );
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const visible = !ctaVisible;

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 pb-safe",
        "bg-gradient-to-t from-background via-background/95 to-transparent",
        "transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full pointer-events-none",
      )}
    >
      <HomeCTA
        waLabel={t("cta")}
        buttonClassName="w-full rounded-full h-12 font-semibold gap-2 text-base"
      />
    </div>
  );
}
