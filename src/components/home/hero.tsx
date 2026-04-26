"use client";

import { Button } from "@/src/components/ui/button";
import { WHATSAPP_NUMBER } from "@/src/lib/constants";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const WA_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;
const PHRASE_COUNT = 6;
const TYPE_SPEED = 85;
const DELETE_SPEED = 30;
const PAUSE_MS = 3200;

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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
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
  const displayedTotal = reducedMotion
    ? totalChars(currentPhrase)
    : charIndex;

  return (
    <section className="section-light min-h-screen flex flex-col items-center justify-center pt-20 pb-24 px-6 gap-y-8">
      {/* Typewriter */}
      <div className="max-w-3xl w-full flex flex-col items-center gap-y-3">
        <div className="min-h-[240px] sm:min-h-[200px] lg:min-h-[240px] flex items-center justify-center w-full">
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

        {/* Tagline */}
        <p className="text-[18px] font-normal text-muted-foreground text-center">
          <strong className="font-normal text-black dark:text-white">
            Enkeeper
          </strong>
          . {t("tagline")}
        </p>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-y-3">
        <a href={WA_LINK} target="_blank" rel="noopener noreferrer">
          <Button
            size="lg"
            className="rounded-full px-8 h-12 font-semibold gap-2 text-base"
          >
            <WhatsAppIcon className="w-5 h-5" />
            {t("cta")}
          </Button>
        </a>
        <p className="text-[13px] text-muted-foreground/70 text-center">
          {t("microcopy")}
        </p>
      </div>
    </section>
  );
}
