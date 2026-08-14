"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/lib/utils";
import { HomeCTA } from "@/src/components/home/home-cta";

export default function FloatingCta() {
  const t = useTranslations("home");
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [pricingInView, setPricingInView] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolledPastHero(window.scrollY > window.innerHeight * 0.8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const pricingEl = document.getElementById("pricing");
    let observer: IntersectionObserver | undefined;
    if (pricingEl) {
      observer = new IntersectionObserver(
        ([entry]) => setPricingInView(entry.isIntersecting),
        { threshold: 0 },
      );
      observer.observe(pricingEl);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  const visible = scrolledPastHero && !pricingInView;

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
