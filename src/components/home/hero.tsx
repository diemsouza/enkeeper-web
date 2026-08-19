"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown } from "lucide-react";
import { HomeCTA } from "@/src/components/home/home-cta";

const PHRASE_COUNT = 4;
const TYPE_SPEED = 85;
const DELETE_SPEED = 30;
const PAUSE_MS = 3200;
const IS_WAITLIST = process.env.NEXT_PUBLIC_WAITLIST_MODE === "true";

type Segment = { text: string; bold: boolean };

function parsePhrase(html: string): Segment[] {
  const result: Segment[] = [];
  const regex = /<strong>(.*?)<\/strong>/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      result.push({ text: html.slice(lastIndex, match.index), bold: false });
    }
    result.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < html.length) {
    result.push({ text: html.slice(lastIndex), bold: false });
  }
  return result;
}

function renderTyped(phrase: Segment[], charIndex: number) {
  let remaining = charIndex;
  return phrase.map((seg, i) => {
    if (remaining <= 0) return null;
    const visible = seg.text.slice(0, remaining);
    remaining -= visible.length;
    if (!visible) return null;
    return seg.bold ? (
      <strong key={i} className="font-[600]">
        {visible}
      </strong>
    ) : (
      <span key={i}>{visible}</span>
    );
  });
}

export default function Hero() {
  const t = useTranslations("home");

  const phrases = useMemo(
    () =>
      Array.from({ length: PHRASE_COUNT }, (_, i) =>
        parsePhrase(t.raw(`phrases.${i}`) as string),
      ),
    [t],
  );

  const totalChars = (phrase: Segment[]) =>
    phrase.reduce((sum, seg) => sum + seg.text.length, 0);

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    if (isPaused) {
      const timer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, PAUSE_MS);
      return () => clearTimeout(timer);
    }

    const total = totalChars(phrases[phraseIndex]);

    if (!isDeleting) {
      if (charIndex < total) {
        const timer = setTimeout(() => setCharIndex((c) => c + 1), TYPE_SPEED);
        return () => clearTimeout(timer);
      } else {
        setIsPaused(true);
      }
    } else {
      if (charIndex > 0) {
        const timer = setTimeout(
          () => setCharIndex((c) => c - 1),
          DELETE_SPEED,
        );
        return () => clearTimeout(timer);
      } else {
        setIsDeleting(false);
        setPhraseIndex((p) => (p + 1) % PHRASE_COUNT);
      }
    }
  }, [charIndex, isDeleting, isPaused, phraseIndex, reducedMotion]);

  const currentPhrase = phrases[phraseIndex];
  const displayedTotal = reducedMotion ? totalChars(currentPhrase) : charIndex;

  return (
    <section className="section-light relative min-h-[100lvh] flex flex-col items-center justify-center pt-20 pb-24 px-6 gap-y-8">
      <div className="max-w-3xl w-full flex flex-col items-center gap-y-3">
        {/* Headline fixa */}
        <h1 className="text-[20px] sm:text-[28px] lg:text-[30px] font-normal leading-[1.15] text-center text-muted-foreground">
          {t("headline")}
        </h1>

        {/* Frase rotativa (typewriter) */}
        <div className="min-h-[240px] sm:min-h-[200px] lg:min-h-[300px] flex items-center justify-center w-full">
          <p className="text-[40px] sm:text-[56px] lg:text-[64px] font-normal leading-[1.15] text-center">
            {renderTyped(currentPhrase, displayedTotal)}
            <span
              className={
                isPaused
                  ? "typewriter-cursor typewriter-cursor-hidden"
                  : "typewriter-cursor"
              }
            >
              |
            </span>
          </p>
        </div>

        {/* Preço sutil */}
        <p className="text-md font-normal  text-muted-foreground text-center mb-2">
          {t("price_teaser")}
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-y-2">
        <HomeCTA
          waLabel={t("cta")}
          buttonClassName="rounded-full px-12 h-12 font-semibold gap-2 text-base"
        />
        <p className="text-sm text-muted-foreground/70 text-center">
          {IS_WAITLIST ? t("waitlist_microcopy") : t("microcopy")}
        </p>
      </div>

      <a
        href="#features"
        aria-label="Rolar para o próximo conteúdo"
        className="absolute bottom-12 md:bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground/60 pb-[env(safe-area-inset-bottom)]"
      >
        <ArrowDown className="w-6 h-6" />
      </a>
    </section>
  );
}
