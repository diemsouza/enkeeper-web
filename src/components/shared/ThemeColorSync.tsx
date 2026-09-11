"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const THEME_COLORS = {
  light: "#ffffff", // cor real do fundo claro da sua paleta
  dark: "#0a0a0a", // cor real do fundo escuro da sua paleta
} as const;

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;

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
