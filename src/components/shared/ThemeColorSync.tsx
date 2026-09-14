"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from "@/src/lib/constants";

const THEME_COLORS = {
  light: THEME_COLOR_LIGHT,
  dark: THEME_COLOR_DARK,
} as const;

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;

    // Espelha no cookie pra o servidor conseguir renderizar o tema certo
    // desde o primeiro byte no proximo carregamento - localStorage sozinho
    // (usado pelo next-themes) nao e visivel pro servidor.
    document.cookie = `theme=${resolvedTheme}; path=/; max-age=31536000; SameSite=Lax`;

    const color =
      THEME_COLORS[resolvedTheme as keyof typeof THEME_COLORS] ??
      THEME_COLORS.dark;

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", color);
  }, [resolvedTheme]);

  return null;
}
