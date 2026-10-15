"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/src/hooks/use-toast";
import { CHECKOUT_PLAN_BY_INTERVAL, track } from "@/src/lib/analytics";
import type { PaidPurchase } from "@/src/services/stripe-checkout-service";

const TRACKED_PURCHASE_KEY_PREFIX = "fz_purchase_tracked_";

function trackPurchaseOnce({
  transactionId,
  value,
  interval,
}: PaidPurchase): void {
  const storageKey = `${TRACKED_PURCHASE_KEY_PREFIX}${transactionId}`;
  try {
    if (window.localStorage.getItem(storageKey)) return;
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // Storage bloqueado (modo privado): o router.replace abaixo ja evita o refresh duplicar.
  }
  const plan = CHECKOUT_PLAN_BY_INTERVAL[interval];
  track("purchase", {
    transaction_id: transactionId,
    value,
    currency: "BRL",
    items: [
      {
        item_id: plan,
        item_name: `Fluizer Pro ${plan}`,
        price: value,
        quantity: 1,
      },
    ],
  });
}

export function PaymentSuccessToast({
  purchase,
}: {
  purchase: PaidPurchase | null;
}) {
  const t = useTranslations("pricing");
  const { toast } = useToast();
  const router = useRouter();
  const hasShown = useRef(false);

  useEffect(() => {
    if (hasShown.current) return;
    hasShown.current = true;
    toast({ description: t("payment_confirmed") });
    if (purchase) trackPurchaseOnce(purchase);
    router.replace("/app");
  }, [t, toast, router, purchase]);

  return null;
}
