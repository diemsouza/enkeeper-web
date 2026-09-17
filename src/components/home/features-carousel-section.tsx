"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/src/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/src/components/ui/carousel";

const BLOCK_COUNT = 6;

export default function FeaturesCarouselSection() {
  const t = useTranslations("home.features_carousel");
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
    api.on("select", () => setSelectedIndex(api.selectedScrollSnap()));
  }, [api]);

  return (
    <section
      id="features"
      className="section-dark py-[120px] px-6 md:py-[80px] scroll-mt-24"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-[28px] sm:text-[34px] md:text-[38px] font-normal leading-tight mb-4">
            {t("title")}
          </h2>
          <p className="text-[17px] text-muted-foreground max-w-xl mx-auto leading-[1.7]">
            {t("subtitle")}
          </p>
        </div>

        <Carousel
          opts={{ loop: true }}
          setApi={setApi}
          className="px-4 sm:px-12"
        >
          <CarouselContent>
            {Array.from({ length: BLOCK_COUNT }, (_, i) => (
              <CarouselItem key={i}>
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                  <div className="flex-1 order-2 md:order-1">
                    <h3 className="text-2xl font-[600] mb-3">
                      {t(`blocks.${i}.title`)}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {t(`blocks.${i}.description`)}
                    </p>
                  </div>
                  <div className="flex-1 order-1 md:order-2 w-full">
                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/images/features/${i}.jpg`}
                        alt={t(`blocks.${i}.title`)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: BLOCK_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === selectedIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
