"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui/button";
import { PricingCard } from "@/src/components/shared/pricing-card";
import { useToast } from "@/src/hooks/use-toast";
import { postJson } from "@/src/lib/api-client";
import { BILLING_PORTAL_PATH, SubscriptionInterval } from "@/src/lib/constants";

const CTA_CLASS_NAME = "w-full rounded-full h-12 font-semibold text-base";

function CurrentPlanCta() {
  const t = useTranslations("pricing");

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" className={CTA_CLASS_NAME} disabled>
        {t("current_plan")}
      </Button>
      <Button size="lg" variant="outline" className={CTA_CLASS_NAME} asChild>
        <a href={BILLING_PORTAL_PATH}>{t("manage_plan")}</a>
      </Button>
    </div>
  );
}

export function PlansCheckout({
  currentInterval,
  canceledNote,
}: {
  currentInterval: SubscriptionInterval | null;
  canceledNote: string | null;
}) {
  const t = useTranslations("pricing");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe(interval: SubscriptionInterval) {
    setLoading(true);
    const { ok, body } = await postJson<{ url?: string }>(
      "/api/app/billing/checkout",
      { interval },
    );
    if (!ok || !body.url) {
      setLoading(false);
      toast({ variant: "destructive", title: t("checkout_error") });
      return;
    }
    window.location.assign(body.url);
  }

  return (
    <PricingCard
      lockedInterval={currentInterval ?? undefined}
      renewNote={canceledNote ?? undefined}
      renderCta={(interval) =>
        currentInterval ? (
          <CurrentPlanCta />
        ) : (
          <Button
            size="lg"
            className={CTA_CLASS_NAME}
            disabled={loading}
            onClick={() => handleSubscribe(interval)}
          >
            {t("subscribe_cta")}
          </Button>
        )
      }
    />
  );
}
