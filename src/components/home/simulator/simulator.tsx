"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DOMAINS, type DomainId } from "@/src/lib/constants";
import { HomeCTA } from "@/src/components/home/home-cta";
import { SIMULATOR_ROTEIROS } from "./roteiro-data";
import { DomainSelector } from "./domain-selector";
import { DesktopShell } from "./desktop-shell";
import { IphoneShell } from "./iphone-shell";
import { SimulatorThreadPanel } from "./simulator-thread-panel";
import { useSyncedScroll } from "./use-synced-scroll";
import { useInnerScrollGate } from "./use-inner-scroll-gate";

export default function Simulator() {
  const t = useTranslations("home.simulator");
  const [activeDomain, setActiveDomain] = useState<DomainId>(DOMAINS[0].id);
  const roteiro = SIMULATOR_ROTEIROS[activeDomain];
  const { primaryRef, secondaryRef, onPrimaryScroll, onSecondaryScroll } =
    useSyncedScroll();
  const { targetRef: shellRef, isScrollEnabled } =
    useInnerScrollGate<HTMLDivElement>();

  const summary = { text: roteiro.summaryText, time: roteiro.summaryTime };
  const pentagon = { input: roteiro.pentagon, time: roteiro.summaryTime };

  return (
    <section
      id="simulator"
      className="section-light px-6 pb-24 overflow-x-hidden"
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
        <DomainSelector active={activeDomain} onChange={setActiveDomain} />

        <div ref={shellRef} className="relative w-full max-w-4xl mx-auto">
          <DesktopShell>
            <SimulatorThreadPanel
              ref={primaryRef}
              messages={roteiro.messages}
              summary={summary}
              pentagon={pentagon}
              onScroll={onPrimaryScroll}
              isScrollEnabled={isScrollEnabled}
            />
          </DesktopShell>
          <IphoneShell>
            <SimulatorThreadPanel
              ref={secondaryRef}
              messages={roteiro.messages}
              summary={summary}
              pentagon={pentagon}
              onScroll={onSecondaryScroll}
              size="compact"
            />
          </IphoneShell>
        </div>

        <div className="max-w-xl text-center flex flex-col items-center gap-4 pt-10 md:pt-16">
          <p className="text-muted-foreground">{t("differentiation_line")}</p>
          <HomeCTA
            waLabel={t("cta")}
            buttonClassName="px-8 gap-2"
            isCtaAnchor
          />
        </div>
      </div>
    </section>
  );
}
