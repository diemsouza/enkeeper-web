"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { HomeCTA } from "@/src/components/home/home-cta";
import { cn } from "@/src/lib/utils";

const SUBPHRASE_COUNT = 3;
const CROSSFADE_INTERVAL_MS = 10000;
const FADE_DURATION_MS = 500;
const IS_WAITLIST = process.env.NEXT_PUBLIC_WAITLIST_MODE === "true";

function useCrossfadeIndex(
  count: number,
  intervalMs: number,
  reducedMotion: boolean,
) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reducedMotion || count <= 1) return;
    let fadeTimer: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setVisible(false);
      fadeTimer = setTimeout(() => {
        setIndex((i) => (i + 1) % count);
        setVisible(true);
      }, FADE_DURATION_MS);
    }, intervalMs);
    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimer);
    };
  }, [count, intervalMs, reducedMotion]);

  return { index, visible };
}

export default function Hero() {
  const t = useTranslations("home");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  const { index: subIndex, visible: subVisible } = useCrossfadeIndex(
    SUBPHRASE_COUNT,
    CROSSFADE_INTERVAL_MS,
    reducedMotion,
  );

  return (
    <section className="section-light relative flex flex-col items-center justify-center pt-28 pb-24 px-6 gap-y-4">
      <div className="max-w-3xl w-full flex flex-col items-center gap-y-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-sm text-muted-foreground">
          <Target className="w-4 h-4 text-primary" aria-hidden="true" />
          {t("hero.badge")}
        </span>

        <h1 className="text-4xl md:text-5xl font-normal leading-[1.15] text-center py-6">
          {t("hero.headline")}
        </h1>

        <p
          className={cn(
            "text-lg sm:text-xl text-muted-foreground text-center transition-opacity duration-500 min-h-[3.5rem] flex items-center justify-center",
            subVisible ? "opacity-100" : "opacity-0",
          )}
        >
          {t(`hero.subphrases.${subIndex}`)}
        </p>
      </div>

      <div className="flex flex-col items-center gap-y-2 pt-1">
        <HomeCTA
          waLabel={t("hero.cta")}
          buttonClassName="rounded-full px-12 h-12 font-semibold gap-2 text-base"
        />
        <p className="text-sm text-muted-foreground/70 text-center">
          {IS_WAITLIST ? t("waitlist_microcopy") : t("hero.microcopy")}
        </p>
      </div>
    </section>
  );
}
