"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/src/components/ui/carousel";
import { logEvent } from "@/src/lib/analytics";
import { useTranslations } from "next-intl";

// Steps images (mantidos)
const stepImages = [
  "https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=800&h=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1525130413817-d45c1d127c42?q=80&w=800&h=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517940001917-1c03b8b1b85b?q=80&w=800&h=500&auto=format&fit=crop",
];

const ThreeSteps = () => {
  const t = useTranslations("home.threeSteps");

  const [isMobile, setIsMobile] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto scroll for mobile carousel
  useEffect(() => {
    if (!carouselApi || !isMobile) return;
    const intervalId = setInterval(() => {
      carouselApi.scrollNext();
    }, 4000);
    return () => clearInterval(intervalId);
  }, [carouselApi, isMobile]);

  // Textos dos passos via locale; imagens mantidas
  const steps = [0, 1, 2].map((i) => ({
    title: t(`steps.${i}.title`),
    description: t(`steps.${i}.description`),
    action: t(`steps.${i}.action`),
    image: stepImages[i],
  }));

  return (
    <section className="py-16 md:py-24 section-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="text-gradient">{t("title_highlight")}</span>{" "}
            {t("title_suffix")}
          </h2>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {isMobile ? (
          // Mobile view - carousel
          <div className="w-full">
            <Carousel
              opts={{ align: "center", loop: true }}
              className="w-full"
              setApi={setCarouselApi}
            >
              <CarouselContent>
                {steps.map((step, index) => (
                  <CarouselItem key={index} className="basis-full">
                    <div className="bg-background rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
                      <div className="relative h-48">
                        <img
                          src={step.image}
                          alt={step.title}
                          className="w-full h-full object-cover"
                          width={800}
                          height={500}
                        />
                      </div>
                      <div className="p-6 pt-8 flex flex-col">
                        <h3 className="text-xl font-semibold mb-2">
                          {step.title}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          {step.description}
                        </p>
                        {/* <Button variant="link" className="mt-auto">
                          {step.action}
                        </Button> */}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        ) : (
          // Desktop view - grid
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, index) => (
              <div
                key={index}
                className="bg-background rounded-xl overflow-hidden shadow-sm flex flex-col h-full relative"
              >
                <div className="h-48">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full h-full object-cover"
                    width={800}
                    height={500}
                  />
                </div>
                <div className="p-3 pt-3 flex flex-col">
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground mb-1">
                    {step.description}
                  </p>
                  {/* <Button variant="link" className="mt-auto">
                    {step.action}
                  </Button> */}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Button
            asChild
            className="shadow-lg hover:scale-105 transition-all rounded-full px-8 py-6"
          >
            <a
              href="#pricing"
              onClick={() =>
                logEvent({
                  action: "cta_click",
                  category: "cta",
                  label: "Three steps - Request form",
                })
              }
            >
              {t("cta_primary")}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ThreeSteps;
