"use client";

import { ThemeSwitcher } from "@/src/components/ui/theme-switcher";
import { cn } from "@/src/lib/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

type NavProps = { hasLoginLink?: boolean };

export default function Nav({ hasLoginLink = true }: NavProps) {
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
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-6 md:px-12 transition-all duration-300",
        scrolled && "glass-effect border-b border-border/40",
      )}
    >
      <Link
        href="/"
        className="font-semibold tracking-tight text-lg select-none"
      >
        {t("brand")}
        <span className="text-primary">.</span>
      </Link>

      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        {hasLoginLink && (
          <Link
            href="/app"
            className="touch-target text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tHome("login")}
          </Link>
        )}
      </div>
    </nav>
  );
}
