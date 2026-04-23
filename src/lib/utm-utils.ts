export interface UtmParams {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  gclid?: string | null;
}

export const getUtmParams = (url?: string | null): UtmParams => {
  if (!url) return {};

  let searchParams: URLSearchParams;

  try {
    const parsedUrl = new URL(url);
    searchParams = parsedUrl.searchParams;
  } catch {
    // Se não for uma URL completa, tenta tratar como query string
    searchParams = new URLSearchParams(url);
  }

  const getValue = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = searchParams.get(key);
      if (value !== null && value !== "") {
        return value;
      }
    }
    return;
  };

  return {
    utmSource: getValue(["utm_source", "utmSource"]),
    utmMedium: getValue(["utm_medium", "utmMedium"]),
    utmCampaign: getValue(["utm_campaign", "utmCampaign"]),
    utmTerm: getValue(["utm_term", "utmTerm"]),
    utmContent: getValue(["utm_content", "utmContent"]),
    gclid: getValue(["gclid"]),
  };
};
