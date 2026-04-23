"use client";

import { useTranslations } from "next-intl";
import { WhatsAppChat } from "@/src/components/whatsapp-chat";
import { useInView } from "@/src/hooks/use-in-view";
import { cn } from "@/src/lib/utils";

type RawMsg = { from: "user" | "bot"; text: string; time: string };

export default function FeaturesDemo() {
  const tDemo = useTranslations("home.features_demo");
  const [ref, inView] = useInView();

  const blocks = [0, 1, 2].map((i) => ({
    title: tDemo(`blocks.${i}.title`),
    description: tDemo(`blocks.${i}.description`),
    messages: tDemo.raw(`blocks.${i}.chat`) as RawMsg[],
  }));

  return (
    <section className="bg-[#F5F5F7] dark:bg-[#1C1C1E] py-[80px] md:py-[120px] px-6">
      <div className="max-w-[720px] mx-auto flex flex-col gap-12">
        {/* Header */}
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          className={cn(
            "text-center transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          <h2 className="text-[32px] sm:text-[40px] font-[600] leading-tight mb-4">
            {tDemo("title")}
          </h2>
          <p className="text-[17px] text-muted-foreground max-w-xl mx-auto leading-[1.7]">
            {tDemo("subtitle")}
          </p>
        </div>

        {/* Cards */}
        {blocks.map((block, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col md:flex-row items-center gap-8 md:gap-16",
              i % 2 !== 0 && "md:flex-row-reverse"
            )}
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-[22px] sm:text-[26px] font-[600] mb-3 leading-tight">
                {block.title}
              </h3>
              <p className="text-[16px] text-muted-foreground leading-[1.7]">
                {block.description}
              </p>
            </div>
            <div className="shrink-0">
              <WhatsAppChat messages={block.messages} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
