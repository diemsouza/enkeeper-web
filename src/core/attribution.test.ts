import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_VALUE_MAX_LENGTH,
  buildAttributionCookie,
  buildSourceData,
  hasAttributionSignal,
  parseAttributionCookie,
  resolveSource,
  sanitizeAttributionValue,
} from "./attribution";
import { getUtmParams } from "../lib/utm-utils";

const NOW = new Date("2026-10-15T12:00:00.000Z");

describe("sanitizeAttributionValue", () => {
  it("returns null for non-string and blank values", () => {
    expect(sanitizeAttributionValue(undefined)).toBeNull();
    expect(sanitizeAttributionValue(42)).toBeNull();
    expect(sanitizeAttributionValue("   ")).toBeNull();
  });

  it("trims and strips control characters", () => {
    expect(sanitizeAttributionValue("  goo\u0000gle\n\t ")).toBe("google");
  });

  it("limits the length", () => {
    const long = "a".repeat(ATTRIBUTION_VALUE_MAX_LENGTH + 50);
    expect(sanitizeAttributionValue(long)).toHaveLength(
      ATTRIBUTION_VALUE_MAX_LENGTH,
    );
  });
});

describe("getUtmParams", () => {
  it("parses campaign params and click ids from a full URL", () => {
    const params = getUtmParams(
      "https://fluizer.com/?utm_source=google&utm_medium=cpc&utm_campaign=teste1&gclid=TESTE123",
    );
    expect(params).toMatchObject({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "teste1",
      gclid: "TESTE123",
    });
    expect(params.fbclid).toBeUndefined();
  });

  it("returns an empty object without a URL", () => {
    expect(getUtmParams(null)).toEqual({});
  });
});

describe("buildAttributionCookie", () => {
  it("sanitizes every field coming from the URL", () => {
    const cookie = buildAttributionCookie(
      {
        utmSource: " google\u0007 ",
        gclid: "x".repeat(500),
        referrer: "",
        landingPath: "/",
      },
      NOW,
    );
    expect(cookie.utmSource).toBe("google");
    expect(cookie.gclid).toHaveLength(ATTRIBUTION_VALUE_MAX_LENGTH);
    expect(cookie.referrer).toBeNull();
    expect(cookie.firstSeenAt).toBe(NOW.toISOString());
  });
});

describe("parseAttributionCookie", () => {
  it("returns null for empty, malformed or non-object input", () => {
    expect(parseAttributionCookie(undefined)).toBeNull();
    expect(parseAttributionCookie("not json")).toBeNull();
    expect(parseAttributionCookie("42")).toBeNull();
  });

  it("re-sanitizes a tampered cookie", () => {
    const raw = JSON.stringify({
      utmSource: "a".repeat(1000),
      landingPath: "/",
      firstSeenAt: NOW.toISOString(),
    });
    const parsed = parseAttributionCookie(raw);
    expect(parsed?.utmSource).toHaveLength(ATTRIBUTION_VALUE_MAX_LENGTH);
  });
});

describe("buildSourceData", () => {
  it("returns only the seven snake_case campaign fields", () => {
    const cookie = buildAttributionCookie(
      {
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "teste1",
        gclid: "TESTE123",
        referrer: "https://www.google.com/",
        landingPath: "/",
      },
      NOW,
    );
    expect(buildSourceData(cookie)).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "teste1",
      utm_content: null,
      utm_term: null,
      gclid: "TESTE123",
      fbclid: null,
    });
  });
});

describe("resolveSource", () => {
  const build = (params: Parameters<typeof buildAttributionCookie>[0]) =>
    buildAttributionCookie(params, NOW);

  it("keeps paid media mapping", () => {
    expect(
      resolveSource(
        build({ utmSource: "google", utmMedium: "cpc", landingPath: "/" }),
      ),
    ).toBe("google_ads");
    expect(
      resolveSource(
        build({ utmSource: "facebook", utmMedium: "paid", landingPath: "/" }),
      ),
    ).toBe("meta_ads");
  });

  it("falls back to utm_source, referrer and direct", () => {
    expect(resolveSource(build({ utmSource: "news", landingPath: "/" }))).toBe(
      "news",
    );
    expect(
      resolveSource(
        build({ referrer: "https://www.google.com/", landingPath: "/" }),
      ),
    ).toBe("organic_search");
    expect(resolveSource(null)).toBe("direct");
  });
});

describe("hasAttributionSignal", () => {
  it("is false for an empty cookie and true with a click id", () => {
    expect(hasAttributionSignal(buildAttributionCookie({ landingPath: "/" }, NOW))).toBe(false);
    expect(
      hasAttributionSignal(
        buildAttributionCookie({ gclid: "abc", landingPath: "/" }, NOW),
      ),
    ).toBe(true);
  });
});
