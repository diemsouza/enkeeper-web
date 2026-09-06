"use client";

import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenuItem } from "@/src/components/ui/dropdown-menu";

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Laptop },
] as const;

export function ThemeMenuItems() {
  const { theme, setTheme } = useTheme();

  return (
    <>
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <DropdownMenuItem
          key={value}
          onClick={() => setTheme(value)}
          className="gap-2"
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1">{label}</span>
          {theme === value && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}
