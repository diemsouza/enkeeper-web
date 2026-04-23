export function getLocaleFromLang(
  lang: string,
  defaultLocale?: string,
): string {
  return lang.toLowerCase() === "pt" || lang.toLowerCase() === "pt-br"
    ? "pt-BR"
    : lang.toLowerCase() === "en" || lang.toLowerCase() === "en-us"
      ? "en-US"
      : defaultLocale || "";
}

export function getLangFromLocale(
  locale: string,
  defaultLocale?: string,
): string {
  return locale.toLowerCase() === "pt-br" || locale.toLowerCase() === "pt"
    ? "pt"
    : locale.toLowerCase() === "en-us" || locale.toLowerCase() === "en"
      ? "en"
      : defaultLocale || "";
}
