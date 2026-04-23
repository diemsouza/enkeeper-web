"use client";

import React from "react";
import { MessageCircle, Zap, TrendingUp } from "lucide-react";
import { Button } from "../ui/button";
import { logEvent } from "@/src/lib/analytics";
import { useTranslations } from "next-intl";

const Features = () => {
  const t = useTranslations("home.features");

  const featureIcons = [
    <MessageCircle key="0" className="h-8 w-8 text-chat-blue" />,
    <Zap key="1" className="h-8 w-8 text-chat-purple" />,
    <TrendingUp key="2" className="h-8 w-8 text-chat-blue" />,
  ];

  const bullets = [
    t("section2.bullets.0"),
    t("section2.bullets.1"),
    t("section2.bullets.2"),
    t("section2.bullets.3"),
  ];

  return (
    <section className="py-16 md:py-24" id="features">
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

        <div className="grid md:grid-cols-3 gap-12">
          {[0, 1, 2].map((i) => (
            <div key={i} className="group transition-all hover:-translate-y-1">
              <div className="mb-4 bg-primary/10 rounded-lg p-3 inline-block group-hover:bg-primary/20 transition-colors">
                {featureIcons[i]}
              </div>
              <h3 className="text-xl font-semibold mb-3">
                {t(`items.${i}.title`)}
              </h3>
              <p className="text-muted-foreground">
                {t(`items.${i}.description`)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-8 md:p-10">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                {t("section2.title")}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t("section2.description")}
              </p>
              <ul className="space-y-3">
                {bullets.map((item, i) => (
                  <li key={i} className="flex items-start">
                    <div className="mr-3 mt-1 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary"></div>
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="bg-card rounded-lg p-4 shadow-sm">
                <p className="text-sm">{t("section2.example.assistant1")}</p>
                <div className="text-xs text-right mt-1 text-muted-foreground">
                  Assistente – 10:23
                </div>
              </div>

              <div className="bg-primary/10 rounded-lg p-4 ml-8">
                <p className="text-sm">{t("section2.example.client1")}</p>
                <div className="text-xs text-right mt-1 text-muted-foreground">
                  Cliente – 10:24
                </div>
              </div>

              <div className="bg-card rounded-lg p-4">
                <p className="text-sm">{t("section2.example.assistant2")}</p>
                <div className="text-xs text-right mt-1 text-muted-foreground">
                  Assistente – 10:25
                </div>
              </div>

              <div className="bg-primary/10 rounded-lg p-4 ml-8">
                <p className="text-sm">{t("section2.example.client2")}</p>
                <div className="text-xs text-right mt-1 text-muted-foreground">
                  Cliente – 10:26
                </div>
              </div>

              <div className="bg-card rounded-lg p-4">
                <p className="text-sm">{t("section2.example.assistant3")}</p>
                <div className="text-xs text-right mt-1 text-muted-foreground">
                  Assistente – 10:27
                </div>
              </div>
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
                label: "Features - Request form",
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

export default Features;
