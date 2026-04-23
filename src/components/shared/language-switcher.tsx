"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";
import { LOCALES } from "@/src/lib/constants";

export function LanguageSwitcher() {
  const pathname = usePathname();
  const search = useSearchParams();
  const t = useTranslations("locales");
  const tApp = useTranslations("app");

  const makeHref = (locale: string) => {
    const params = new URLSearchParams(search?.toString());
    params.set("lang", locale.split("-")[0]);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const handleClick = async (locale: string) => {
    if (!LOCALES.includes(locale as any) || locale == tApp("locale")) return;
    window.location.replace(makeHref(locale));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={"sm"}
          className="p-2 mx-2 focus:outline-none focus-visible:ring-transparent"
        >
          {tApp("lang")?.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={`lang_${locale}`}
            onClick={() => handleClick(locale)}
            className={
              locale === tApp("locale")
                ? "font-bold cursor-pointer"
                : "font-normal cursor-pointer"
            }
          >
            {t(locale.split("-")[0])}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
