"use client";

import { useTranslations } from "next-intl";
import { SidebarTrigger } from "@/src/components/ui/sidebar";
import { PracticePill } from "./practice-pill";

export function AppHeader() {
  const t = useTranslations("common");
  return (
    <header
      className="glass-effect flex min-h-[max(3.5rem,calc(44px_+_env(safe-area-inset-top)))] shrink-0 items-center gap-2 border-b border-border/40 px-3 md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <SidebarTrigger className="h-control-mini w-control-mini" />
      <span className="truncate text-sm font-medium">{t("brand")}</span>
      <PracticePill size="mini" className="ml-auto mr-1" />
    </header>
  );
}
