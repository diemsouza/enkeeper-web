"use client";

import Link from "next/link";
//import { ThemeSwitcher } from "@/src/components/ui/theme-switcher";
// import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { cn } from "@/src/lib/utils";
// import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import { logEvent } from "@/src/lib/analytics";
import { useTranslations } from "next-intl";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showLogin?: boolean;
  centralized?: boolean;
}

export function Header({
  title,
  subtitle,
  showLogin = true,
  centralized = false,
}: HeaderProps) {
  // const [isLoading, setIsLoading] = useState(true);
  // const [sessionData, setSessionData] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  // const supabase = createClientComponentClient();
  // const pathname = usePathname();
  const t = useTranslations("home.header");
  const tApp = useTranslations("app");

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    // Check for user's preferred color scheme
    // if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    //   setIsDarkMode(true);
    //   document.documentElement.classList.add("dark");
    // }

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // useEffect(() => {
  //   const checkUser = async () => {
  //     const {
  //       data: { session },
  //     } = await supabase.auth.getSession();
  //     setSessionData(session);
  //     setIsLoading(false);
  //   };
  //   checkUser();
  // }, [supabase.auth]);

  return (
    <header
      className={cn(
        "fixed px-4 top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "py-3 glass-effect border-b shadow-sm"
          : "py-5 bg-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto flex items-center justify-between",
          centralized ? "max-w-7xl" : "",
        )}
      >
        {title ? (
          <div className="flex items-center gap-3">
            <div>
              <span className="text-xl font-bold">{title}</span>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
        ) : (
          <Link href="/" className="flex items-center space-x-1">
            <img
              src="/images/logo-150.png "
              width={128}
              height={128}
              className="h-8 w-8 rounded-lg me-1"
            />
            <span className="font-bold text-lg">{tApp("brand")}</span>
          </Link>
        )}
        <div className="flex items-center space-x-4">
          {/* {showLogin && pathname === "/" && sessionData && (
            <Link
              href="/app"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Admin
            </Link>
          )}
          {showLogin && pathname === "/" && !sessionData && (
            <Link
              href="/auth/login"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Entrar
            </Link>
          )} */}
          <Button
            asChild
            size="sm"
            className="md:inline-flex rounded-full px-5"
          >
            <a
              href="#pricing"
              onClick={() =>
                logEvent({
                  action: "cta_click",
                  category: "cta",
                  label: "Header - Request form",
                })
              }
            >
              {t("btn_subscribe_now")}
            </a>
          </Button>
          {/* <ThemeSwitcher /> */}
        </div>
      </div>
    </header>
  );
}
