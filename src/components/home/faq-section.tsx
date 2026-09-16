"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/src/components/ui/accordion";
import { FAQ_IDS } from "@/src/components/home/faq-data";

export default function FaqSection() {
  const t = useTranslations("home.faq");

  return (
    <section className="section-light py-[120px] px-6 md:py-[80px]">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-[28px] sm:text-[34px] md:text-[38px] font-normal leading-tight text-center mb-10">
          {t("title")}
        </h2>

        <Accordion type="single" collapsible>
          {FAQ_IDS.map((id) => (
            <AccordionItem key={id} value={id}>
              <AccordionTrigger className="text-left text-[17px] text-muted-foreground hover:text-foreground hover:no-underline data-[state=open]:text-foreground">
                {t(`items.${id}.question`)}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed text-[16px]">
                {t(`items.${id}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
