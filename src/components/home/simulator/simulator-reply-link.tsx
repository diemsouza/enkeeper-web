"use client";

import { ArrowUp, Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import { buildAppEntryUrl } from "@/src/core/domain-param";
import { useHomeDomain } from "@/src/components/home/home-domain-provider";

// No lugar do composer: o simulador nao responde, entao o campo leva para o
// app com o objetivo da aba tocada, como os CTAs da home.
export function SimulatorReplyLink() {
  const t = useTranslations("home.simulator");
  const homeDomain = useHomeDomain();
  const href = buildAppEntryUrl(homeDomain?.selectedDomain ?? null);

  return (
    <div className="px-3 pb-3 pt-2">
      <a
        href={href}
        className="group mx-auto flex w-full max-w-3xl items-center gap-1.5 rounded-composer border border-border bg-background/70 px-1.5 py-1 shadow-sm backdrop-blur-xl backdrop-saturate-150 transition-colors hover:border-primary/40"
      >
        <span
          aria-hidden
          className="flex h-composer w-composer shrink-0 items-center justify-center rounded-full text-muted-foreground"
        >
          <Paperclip className="h-composer-icon w-composer-icon" />
        </span>
        <span className="flex min-h-composer-field flex-1 items-center text-base text-muted-foreground group-hover:text-foreground">
          {t("reply_in_app")}
        </span>
        <span
          aria-hidden
          className="flex h-composer w-composer shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors group-hover:bg-primary/90"
        >
          <ArrowUp className="h-composer-icon w-composer-icon" />
        </span>
      </a>
    </div>
  );
}
