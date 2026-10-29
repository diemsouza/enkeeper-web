"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui/button";

type EmbeddedBrowserStepProps = {
  loginUrl: string;
  onUseWhatsApp: () => void;
};

export function EmbeddedBrowserStep({
  loginUrl,
  onUseWhatsApp,
}: EmbeddedBrowserStepProps) {
  const t = useTranslations("login");
  const [isCopied, setIsCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(loginUrl);
      setIsCopied(true);
    } catch (err) {
      // Alguns navegadores embutidos bloqueiam a área de transferência; o
      // link fica visível para a pessoa copiar na mão.
      console.error("[EmbeddedBrowserStep] clipboard failed:", err);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">
        {t("embedded_title")}
      </h1>
      <p className="text-base text-muted-foreground">{t("embedded_body")}</p>
      <p className="w-full break-all rounded-md border border-input px-3 py-2 text-left text-sm text-muted-foreground select-all">
        {loginUrl}
      </p>
      <Button type="button" onClick={copyLink} className="w-full">
        {isCopied ? t("embedded_copied") : t("embedded_copy")}
      </Button>
      <button
        type="button"
        onClick={onUseWhatsApp}
        className="h-11 px-2 text-sm text-muted-foreground underline underline-offset-2"
      >
        {t("embedded_whatsapp")}
      </button>
    </div>
  );
}
