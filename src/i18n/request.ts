import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE } from "@/src/lib/constants";

export default getRequestConfig(async () => {
  const messages = await import("@/src/locales/pt.json").then(
    (m) => m.default,
  );
  return { locale: DEFAULT_LOCALE, messages };
});
