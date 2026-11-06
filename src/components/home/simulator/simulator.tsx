"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DOMAINS, type DomainId } from "@/src/lib/constants";
import {
  ACTIVITY_READY_IMAGE_HEIGHT,
  ACTIVITY_READY_IMAGE_WIDTH,
  activityReadyImageUrl,
  buildActivityReadyText,
} from "@/src/core/activity-ready";
import { buildPracticeQuestionMessage } from "@/src/components/chat/practice-turn";
import type { Message } from "@/src/components/chat/types";
import { HomeCTA } from "@/src/components/home/home-cta";
import { useHomeDomain } from "@/src/components/home/home-domain-provider";
import { SIMULATOR_ROTEIROS } from "./roteiro-data";
import { DomainSelector } from "./domain-selector";
import { DesktopShell } from "./desktop-shell";
import { IphoneShell } from "./iphone-shell";
import { SimulatorThreadPanel } from "./simulator-thread-panel";
import { useSyncedScroll } from "./use-synced-scroll";
import { useInnerScrollGate } from "./use-inner-scroll-gate";

export default function Simulator() {
  const t = useTranslations("home.simulator");
  const tReady = useTranslations("app.activity_ready");
  const [activeDomain, setActiveDomain] = useState<DomainId>(DOMAINS[0].id);
  const homeDomain = useHomeDomain();
  const roteiro = SIMULATOR_ROTEIROS[activeDomain];
  const { primaryRef, secondaryRef, onPrimaryScroll, onSecondaryScroll } =
    useSyncedScroll();
  const { targetRef: shellRef, isScrollEnabled } =
    useInnerScrollGate<HTMLDivElement>();

  const { time, domainLabel, focus } = roteiro.confirmation;
  const confirmation: Message = {
    ...buildPracticeQuestionMessage({
      id: `${activeDomain}-confirmation`,
      time,
      text: buildActivityReadyText({
        headline: tReady("headline"),
        phrase: tReady(`phrases.${activeDomain}`),
        domain: domainLabel,
        topic: roteiro.activityTitle,
        focus,
      }),
      image: {
        url: activityReadyImageUrl(activeDomain),
        alt: tReady(`image_alts.${activeDomain}`),
        width: ACTIVITY_READY_IMAGE_WIDTH,
        height: ACTIVITY_READY_IMAGE_HEIGHT,
      },
    }),
  };
  const messages = [confirmation, ...roteiro.messages];

  const summary = { text: roteiro.summaryText, time: roteiro.summaryTime };
  const pentagon = { input: roteiro.pentagon, time: roteiro.summaryTime };

  return (
    <section
      id="simulator"
      className="section-light px-6 pb-24 overflow-x-hidden"
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
        <DomainSelector
          active={activeDomain}
          onChange={(domain) => {
            setActiveDomain(domain);
            homeDomain?.selectDomain(domain);
          }}
        />

        <div ref={shellRef} className="relative w-full max-w-4xl mx-auto">
          <DesktopShell>
            <SimulatorThreadPanel
              ref={primaryRef}
              messages={messages}
              summary={summary}
              pentagon={pentagon}
              onScroll={onPrimaryScroll}
              isScrollEnabled={isScrollEnabled}
            />
          </DesktopShell>
          <IphoneShell>
            <SimulatorThreadPanel
              ref={secondaryRef}
              messages={messages}
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
