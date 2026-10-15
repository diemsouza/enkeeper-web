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

export const ATTRIBUTION_VALUE_MAX_LENGTH = 200;

export type AttributionSourceData = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
};

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export function sanitizeAttributionValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value
    .replace(CONTROL_CHARS, "")
    .trim()
    .slice(0, ATTRIBUTION_VALUE_MAX_LENGTH);
  return clean === "" ? null : clean;
}

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
    utmSource: sanitizeAttributionValue(params.utmSource),
    utmMedium: sanitizeAttributionValue(params.utmMedium),
    utmCampaign: sanitizeAttributionValue(params.utmCampaign),
    utmContent: sanitizeAttributionValue(params.utmContent),
    utmTerm: sanitizeAttributionValue(params.utmTerm),
    gclid: sanitizeAttributionValue(params.gclid),
    fbclid: sanitizeAttributionValue(params.fbclid),
    referrer: sanitizeAttributionValue(params.referrer),
    landingPath: sanitizeAttributionValue(params.landingPath) ?? "/",
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
    return buildAttributionCookie(
      { ...parsed, landingPath: parsed.landingPath ?? "/" },
      new Date(parsed.firstSeenAt ?? Date.now()),
    );
  } catch {
    return null;
  }
}

export function hasAttributionSignal(
  attribution: AttributionCookie | null,
): boolean {
  if (!attribution) return false;
  return [
    attribution.utmSource,
    attribution.utmMedium,
    attribution.utmCampaign,
    attribution.utmContent,
    attribution.utmTerm,
    attribution.gclid,
    attribution.fbclid,
    attribution.referrer,
  ].some((value) => value != null);
}

export function buildSourceData(
  attribution: AttributionCookie,
): AttributionSourceData {
  return {
    utm_source: attribution.utmSource,
    utm_medium: attribution.utmMedium,
    utm_campaign: attribution.utmCampaign,
    utm_content: attribution.utmContent,
    utm_term: attribution.utmTerm,
    gclid: attribution.gclid,
    fbclid: attribution.fbclid,
  };
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
