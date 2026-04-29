"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/src/lib/utils";
import { usePathname } from "next/navigation";

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
  const [sessionData, setSessionData] = useState<any>(null);
  const pathname = usePathname();

  return (
    <header className="fixed w-full py-4 px-4 md:px-6 border-b border-border top-0 left-0 right-0 bg-background/80 backdrop-blur-md z-50">
      <div
        className={cn(
          "mx-auto flex items-center justify-between",
          centralized ? "max-w-7xl" : "",
        )}
      >
        {title ? (
          <div className="flex items-center gap-3">
            <div>
              <h2 className="font-medium text-lg">{title}</h2>
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
            <span className="font-bold text-lg">Dropuz</span>
          </Link>
        )}
        <div className="flex items-center space-x-4">
          {showLogin && pathname === "/" && sessionData && (
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
          )}
        </div>
      </div>
    </header>
  );
}
