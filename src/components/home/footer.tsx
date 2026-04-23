"use client";

import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("home.footer");

  return (
    <footer className="bg-[#F5F5F7] dark:bg-[#111111] border-t border-border">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-center">
        <p className="text-[13px] text-muted-foreground">
          {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
