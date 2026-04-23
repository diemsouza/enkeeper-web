"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LOCALE_COOKIE_NAME, LOCALES } from "@/src/lib/constants";
import { cn } from "@/src/lib/utils";

export function LanguageSwitcherInline() {
  const pathname = usePathname();
  const search = useSearchParams();
  const t = useTranslations("locales");
  const tApp = useTranslations("app");

  const handleClick = async (
    e: React.MouseEvent<HTMLAnchorElement>,
    locale: string,
  ) => {
    e.preventDefault();
    if (!LOCALES.includes(locale as any) || locale == tApp("locale")) return;
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    window.location.replace(makeHref(locale));
  };

  const makeHref = (locale: string) => {
    const params = new URLSearchParams(search?.toString());
    params.set("lang", locale.split("-")[0]);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const orderedLocales = LOCALES.sort((a, b) => {
    if (a === tApp("locale")) return -1;
    if (b === tApp("locale")) return 1;
    return 0;
  });

  return (
    <nav
      aria-label="Language switcher"
      className="inline-flex items-center text-sm"
    >
      {orderedLocales.map((locale, idx) => {
        const isCurrent = locale === tApp("locale");

        return (
          <span key={`locale-${idx}`}>
            {idx !== 0 && idx < orderedLocales.length && (
              <span aria-hidden className="opacity-50 px-2">
                {"|"}
              </span>
            )}
            <span key={locale} className="inline-flex items-center">
              <a
                href={makeHref(locale)}
                className={cn(
                  "underline-offset-4 text-xs",
                  isCurrent
                    ? "font-bold text-muted-foreground"
                    : "font-normal text-muted-foreground hover:underline focus-visible:underline hover:text-black",
                )}
                hrefLang={locale}
                title={t(locale.split("-")[0])}
                onClick={(e) => handleClick(e, locale)}
              >
                {locale.split("-")[0].toUpperCase()}
              </a>
            </span>
          </span>
        );
      })}
    </nav>
  );
}
