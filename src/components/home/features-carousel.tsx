"use client";

import React, { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/src/components/ui/carousel";
import { Separator } from "@/src/components/ui/separator";
import {
  Coffee,
  HelpCircle,
  MessageCircle,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";

const FeaturesCarousel = () => {
  const t = useTranslations("home.hero");

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  useEffect(() => {
    if (!carouselApi) return;
    const featureInterval = setInterval(() => {
      carouselApi.scrollNext();
    }, 5000);
    return () => clearInterval(featureInterval);
  }, [carouselApi]);

  // Ícones fixos; textos via locale por índice correspondente
  const featureIcons = [
    <Timer key="i0" className="h-6 w-6 text-primary" />,
    <MessageCircle key="i1" className="h-6 w-6 text-primary" />,
    <TrendingUp key="i2" className="h-6 w-6 text-primary" />,
    <Coffee key="i3" className="h-6 w-6 text-primary" />,
    <HelpCircle key="i4" className="h-6 w-6 text-primary" />,
  ];

  return (
    <section className="relative pt-0 pb-8 md:pt-0 md:pb-16 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Features carousel - Fixed with proper separators */}
        <div className="w-full overflow-hidden mt-12 lg:mt-16">
          <Carousel
            opts={{
              align: "start",
              loop: true,
              dragFree: true,
              containScroll: "trimSnaps",
            }}
            className="w-full"
            setApi={setCarouselApi}
          >
            <CarouselContent className="-ml-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <CarouselItem
                  key={i}
                  className="pl-4 md:basis-1/3 lg:basis-1/4"
                >
                  <div className="flex items-center gap-4 py-4 px-4 relative">
                    <div className="bg-primary/10 rounded-full p-3">
                      {featureIcons[i]}
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium">
                        {t(`features.${i}.title`)}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(`features.${i}.description`)}
                      </p>
                    </div>
                    <Separator
                      orientation="vertical"
                      className="absolute right-0 top-4 bottom-4 h-[calc(100%-2rem)]"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default FeaturesCarousel;
