"use client";

import { ThemeSwitcher } from "@/src/components/ui/theme-switcher";
import { cn } from "@/src/lib/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Nav() {
  const t = useTranslations("common");
  const tHome = useTranslations("home.nav");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 transition-all duration-300",
        scrolled && "glass-effect border-b border-border/40",
      )}
    >
      <Link href="/" className="font-bold tracking-tight text-lg select-none">
        {t("brand")}
        <span className="text-primary">.</span>
      </Link>

      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        <Link
          href="/app"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tHome("login")}
        </Link>
      </div>
    </nav>
  );
}
