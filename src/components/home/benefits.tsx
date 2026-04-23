"use client";

import React from "react";
import {
  MessageSquare,
  Users,
  CircleCheck,
  Globe,
  Code2,
  Link,
} from "lucide-react";
import { Button } from "../ui/button";
import { logEvent } from "@/src/lib/analytics";
import { useTranslations } from "next-intl";

const Benefits = () => {
  const t = useTranslations("home.benefits");

  return (
    <section className="py-16 md:py-24 section-dark" id="benefits">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Primeira seção */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-3xl font-bold mb-6">{t("section1.title")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("section1.description")}
            </p>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <MessageSquare className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">
                    {t("section1.items.0.title")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("section1.items.0.description")}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <Users className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">
                    {t("section1.items.1.title")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("section1.items.1.description")}
                  </p>
                </div>
              </li>
            </ul>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=800&h=500&auto=format"
              alt={t("section1.image_alt")}
              className="rounded-xl shadow-lg"
              width={800}
              height={500}
            />
            <div className="absolute inset-0 bg-primary/10 rounded-xl" />
          </div>
        </div>

        {/* Segunda seção */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div className="order-2 md:order-1 relative">
            <img
              src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=800&h=500&auto=format"
              alt={t("section2.image_alt")}
              className="rounded-xl shadow-lg"
              width={800}
              height={500}
            />
            <div className="absolute inset-0 bg-primary/10 rounded-xl" />
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-3xl font-bold mb-6">{t("section2.title")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("section2.description")}
            </p>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <CircleCheck className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">
                    {t("section2.items.0.title")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("section2.items.0.description")}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <CircleCheck className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-medium mb-1">
                    {t("section2.items.1.title")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("section2.items.1.description")}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Terceira seção */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">{t("section3.title")}</h2>
            <p className="text-muted-foreground mb-8">
              {t("section3.description")}
            </p>

            <ul className="space-y-4">
              <li className="flex gap-3">
                <Link className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium mb-1">
                    {t("section3.items.0.title")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("section3.items.0.description")}
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <Code2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium mb-1">
                    {t("section3.items.1.title")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("section3.items.1.description")}
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <Globe className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-medium mb-1">
                    {t("section3.items.2.title")}
                  </h3>
                  <p className="text-muted-foreground">
                    {t("section3.items.2.description")}
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=500&q=80&auto=format"
              alt={t("section3.image_alt")}
              className="rounded-xl shadow-lg object-cover w-full"
              width={800}
              height={500}
            />

            {/* Card sobreposto ilustrando multicanal */}
            <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-md p-4 rounded-lg shadow-md border border-primary/20 max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 bg-green-500 rounded-full" />
                <span className="text-sm font-medium">
                  {t("section3.overlay.title")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("section3.overlay.text")}
              </p>
            </div>
          </div>
        </div>
      </div>

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
                label: "Benefits - Request form",
              })
            }
          >
            {t("cta_primary")}
          </a>
        </Button>
      </div>
    </section>
  );
};

export default Benefits;
