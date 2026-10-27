import { CAMPAIGN_PARAM_KEYS } from "../lib/utm-utils";

export type MobilePlatform = "android" | "ios" | "other";

export type CampaignParams = Partial<
  Record<(typeof CAMPAIGN_PARAM_KEYS)[number], string | null>
>;

// Navegadores dentro de apps onde o Google bloqueia o login (disallowed_useragent).
const EMBEDDED_BROWSER_PATTERN =
  /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|musical_ly|Bytedance|TikTok|\bLine\/|Snapchat|LinkedInApp|Pinterest|Twitter/i;

export function isEmbeddedBrowser(userAgent: string): boolean {
  return EMBEDDED_BROWSER_PATTERN.test(userAgent);
}

export function getMobilePlatform(userAgent: string): MobilePlatform {
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  return "other";
}

// Params da URL atual valem mais que os do cookie de atribuição: o cookie
// não passa para o navegador externo, então a URL precisa levar a origem.
export function buildExternalLoginUrl(
  currentUrl: string,
  fallbackParams: CampaignParams,
): string {
  const current = new URL(currentUrl);
  const target = new URL("/login", current.origin);
  const redirectTo = current.searchParams.get("redirect_to");
  if (redirectTo) target.searchParams.set("redirect_to", redirectTo);
  for (const key of CAMPAIGN_PARAM_KEYS) {
    const value = current.searchParams.get(key) ?? fallbackParams[key];
    if (value) target.searchParams.set(key, value);
  }
  return target.toString();
}

export function buildAndroidIntentUrl(url: string): string {
  const { protocol, host, pathname, search } = new URL(url);
  const scheme = protocol.replace(":", "");
  return `intent://${host}${pathname}${search}#Intent;scheme=${scheme};action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

export function buildSafariUrl(url: string): string {
  return url.replace(/^https?:\/\//, (prefix) => `x-safari-${prefix}`);
}
