import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALES,
} from "@/src/lib/constants";
import { getLocaleFromLang } from "../lib/locale-utils";

type Locale = keyof typeof loaders;

const loaders = {
  "pt-BR": () => import("@/src/locales/pt.json").then((m) => m.default),
  "en-US": () => import("@/src/locales/en.json").then((m) => m.default),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requestedLocale = await requestLocale;

  let locale =
    requestedLocale && LOCALES.includes(requestedLocale) ? requestedLocale : "";

  if (!locale) {
    const hdrs = await headers();
    let queryLocale = hdrs.get("x-locale") || "";
    locale =
      queryLocale && LOCALES.includes(queryLocale)
        ? getLocaleFromLang(queryLocale)
        : "";
  }

  if (!locale) {
    let cookieLocale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value || "";
    cookieLocale = getLocaleFromLang(cookieLocale);
    locale = cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : "";
  }

  if (!locale) {
    locale = DEFAULT_LOCALE;
  }

  const messages = await loaders[locale as Locale]();
  return { locale, messages };
});
