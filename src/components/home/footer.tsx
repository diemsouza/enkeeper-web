"use client";

import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("home.footer");
  const tApp = useTranslations("app");

  return (
    <footer className="bg-[#F5F5F7] dark:bg-[#111111] border-t border-border">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-center">
        <p className="text-[13px] text-muted-foreground text-center">
          {tApp("brand")} é um produto da DS Tecnologia LTDA - CNPJ
          49.481.141/0001-62
        </p>
      </div>
      <hr className="border-t border-border w-[150px] mx-auto" />
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-center">
        <p className="text-[13px] text-muted-foreground text-center">
          {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
