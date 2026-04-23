"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui/button";

const DEMO_AGENT_URL = "/chat/7fe344d9";

const DemoCta = () => {
  const t = useTranslations("home.demo_cta");

  const openWidget = () => {
    (window as any).ChatWidget?.open();
  };

  return (
    <section className="py-16 section-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            {t("headline")}
          </h2>
          <p className="text-muted-foreground mb-1">{t("subtitle")}</p>
          <p className="text-sm text-muted-foreground mb-8">{t("caption")}</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              className="rounded-full px-8 py-6 shadow-lg sm:w-4/12"
              onClick={openWidget}
            >
              {t("btn_primary")}
            </Button>
            <Button
              variant="outline"
              className="rounded-full px-8 py-6 shadow-lg sm:w-4/12"
              asChild
            >
              <a
                href={`${DEMO_AGENT_URL}?ref=lp-demo`}
                target="_blank"
                rel="nofollow noopener noreferrer"
              >
                {t("btn_secondary")}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DemoCta;
