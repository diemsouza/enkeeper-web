"use client";

import { useTranslations } from "next-intl";
import { SidebarTrigger } from "@/src/components/ui/sidebar";

export function AppHeader() {
  const t = useTranslations("common");
  return (
    <header
      className="glass-effect flex min-h-14 shrink-0 items-center gap-2 border-b border-border/40 px-2 md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <SidebarTrigger />
      <span className="truncate text-sm font-medium">{t("brand")}</span>
    </header>
  );
}
