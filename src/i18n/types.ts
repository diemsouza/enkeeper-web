import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export type TFn = Awaited<ReturnType<typeof getTranslations<never>>>;

// (Opcional) Tipo compatível com ambos (server/client):
export type TAnyEnv =
  | ReturnType<typeof useTranslations<never>>
  | Awaited<ReturnType<typeof getTranslations<never>>>;
