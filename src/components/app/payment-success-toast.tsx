"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@/src/hooks/use-toast";

export function PaymentSuccessToast() {
  const t = useTranslations("pricing");
  const { toast } = useToast();
  const router = useRouter();
  const hasShown = useRef(false);

  useEffect(() => {
    if (hasShown.current) return;
    hasShown.current = true;
    toast({ description: t("payment_confirmed") });
    router.replace("/app");
  }, [t, toast, router]);

  return null;
}
