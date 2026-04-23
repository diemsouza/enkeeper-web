"use client";

import React from "react";
import { Star } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/src/components/ui/carousel";
import { useTranslations } from "next-intl";

const avatarColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const ratings = [5, 5, 5, 5, 5];

const Testimonials = () => {
  const t = useTranslations("home.testimonials");

  const items = [0, 1, 2, 3, 4].map((i) => ({
    name: t(`items.${i}.name`),
    role: t(`items.${i}.role`),
    content: t(`items.${i}.content`),
    rating: ratings[i],
  }));

  return (
    <section
      className="py-16 md:py-24 section-dark relative overflow-hidden"
      id="testimonials"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent -z-10" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("title_prefix")}{" "}
            <span className="text-gradient">{t("title_highlight")}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {items.map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/2">
                  <div className="p-4">
                    <div className="bg-card rounded-xl p-6 relative">
                      <div className="flex gap-4 items-center mb-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${avatarColors[index]}`}
                        >
                          {getInitials(testimonial.name)}
                        </div>
                        <div>
                          <div className="font-medium">{testimonial.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {testimonial.role}
                          </div>
                          <div className="flex items-center gap-0.5 mt-1">
                            {Array.from({ length: testimonial.rating }).map(
                              (_, i) => (
                                <Star
                                  key={i}
                                  className="w-4 h-4 fill-primary text-primary"
                                />
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        {testimonial.content}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
      <div className="flex flex-col items-center text-center px-4 sm:px-6">
        {/* CTA comentado permanece inalterado */}
      </div>
    </section>
  );
};

export default Testimonials;
