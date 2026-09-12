"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { DropdownMenuItem } from "@/src/components/ui/dropdown-menu";

const THEME_OPTIONS = [
  { value: "light", labelKey: "theme_light", icon: Sun },
  { value: "dark", labelKey: "theme_dark", icon: Moon },
  { value: "system", labelKey: "theme_system", icon: Laptop },
] as const;

export function ThemeMenuItems() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("app.account");

  return (
    <>
      {THEME_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
        <DropdownMenuItem
          key={value}
          onClick={() => setTheme(value)}
          className="gap-2"
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1">{t(labelKey)}</span>
          {theme === value && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}
