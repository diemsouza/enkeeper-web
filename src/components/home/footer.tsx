"use client";

import { useTranslations } from "next-intl";
import { FooterSocial } from "../shared/footer-social";
import Link from "next/link";

export default function Footer() {
  const t = useTranslations("home.footer");
  const tApp = useTranslations("app");

  return (
    <footer className="bg-[#F5F5F7] dark:bg-[#111111] border-t border-border">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-center">
        <p className="text-[13px] text-muted-foreground text-center">
          {tApp("brand")} por DS Tecnologia LTDA - CNPJ 49.481.141/0001-62
        </p>
      </div>
      <hr className="border-t border-border w-[150px] mx-auto" />
      <FooterSocial />
      <hr className="border-t border-border w-[150px] mx-auto" />
      <div className="max-w-5xl mx-auto px-6 pt-5 pb-2 flex items-center justify-center">
        <p className="text-[13px] text-muted-foreground text-center">
          {t("copyright")}
        </p>
      </div>
      <div className="flex items-center justify-center gap-2 pb-6 opacity-80 hover:opacity-100 transition text-sm text-muted-foreground">
        <Link href="/terms" className="hover:text-foreground transition-colors">
          Termos de uso
        </Link>
        •
        <Link
          href="/privacy"
          className="hover:text-foreground transition-colors"
        >
          Privacidade
        </Link>
      </div>
    </footer>
  );
}
