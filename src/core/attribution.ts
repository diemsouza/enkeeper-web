export type AttributionCookie = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  gclid: string | null;
  fbclid: string | null;
  referrer: string | null;
  landingPath: string;
  firstSeenAt: string;
};

type BuildAttributionCookieParams = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  referrer?: string | null;
  landingPath: string;
};

const PAID_MEDIUM_VALUES = ["cpc", "ppc", "paid", "paid-social", "ads"];

const SEARCH_ENGINE_REFERRER_HOSTS = [
  "google.",
  "bing.",
  "yahoo.",
  "duckduckgo.",
  "baidu.",
  "yandex.",
];

export function buildAttributionCookie(
  params: BuildAttributionCookieParams,
  now: Date,
): AttributionCookie {
  return {
    utmSource: params.utmSource ?? null,
    utmMedium: params.utmMedium ?? null,
    utmCampaign: params.utmCampaign ?? null,
    utmContent: params.utmContent ?? null,
    utmTerm: params.utmTerm ?? null,
    gclid: params.gclid ?? null,
    fbclid: params.fbclid ?? null,
    referrer: params.referrer ?? null,
    landingPath: params.landingPath,
    firstSeenAt: now.toISOString(),
  };
}

export function parseAttributionCookie(
  raw: string | null | undefined,
): AttributionCookie | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as AttributionCookie;
  } catch {
    return null;
  }
}

function isPaidMedium(medium: string | null): boolean {
  if (!medium) return false;
  return PAID_MEDIUM_VALUES.includes(medium.toLowerCase());
}

function isSearchEngineReferrer(referrer: string): boolean {
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    return SEARCH_ENGINE_REFERRER_HOSTS.some((host) =>
      hostname.includes(host),
    );
  } catch {
    return false;
  }
}

export function resolveSource(attribution: AttributionCookie | null): string {
  const utmSource = attribution?.utmSource?.toLowerCase() ?? null;
  const utmMedium = attribution?.utmMedium ?? null;
  const referrer = attribution?.referrer ?? null;

  if (
    (utmSource === "fb" || utmSource === "facebook") &&
    isPaidMedium(utmMedium)
  ) {
    return "meta_ads";
  }
  if (
    (utmSource === "ig" || utmSource === "instagram") &&
    isPaidMedium(utmMedium)
  ) {
    return "meta_ads";
  }
  if (utmSource === "google" && utmMedium?.toLowerCase() === "cpc") {
    return "google_ads";
  }
  if (attribution?.utmSource) return attribution.utmSource;
  if (!referrer) return "direct";
  if (isSearchEngineReferrer(referrer)) return "organic_search";
  return "referral";
}
