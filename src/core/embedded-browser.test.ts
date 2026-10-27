import { describe, expect, it } from "vitest";
import {
  buildAndroidIntentUrl,
  buildExternalLoginUrl,
  buildSafariUrl,
  getMobilePlatform,
  isEmbeddedBrowser,
} from "./embedded-browser";

const INSTAGRAM_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; pt_BR)";
const FACEBOOK_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.0;]";
const TIKTOK_ANDROID =
  "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0 Mobile Safari/537.36 musical_ly_2023 BytedanceWebview/d8a21c6";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";

describe("isEmbeddedBrowser", () => {
  it("detecta Instagram, Facebook e TikTok", () => {
    expect(isEmbeddedBrowser(INSTAGRAM_IOS)).toBe(true);
    expect(isEmbeddedBrowser(FACEBOOK_ANDROID)).toBe(true);
    expect(isEmbeddedBrowser(TIKTOK_ANDROID)).toBe(true);
  });

  it("navegador comum não é embutido", () => {
    expect(isEmbeddedBrowser(SAFARI_IOS)).toBe(false);
    expect(isEmbeddedBrowser(CHROME_ANDROID)).toBe(false);
  });
});

describe("getMobilePlatform", () => {
  it("identifica a plataforma", () => {
    expect(getMobilePlatform(INSTAGRAM_IOS)).toBe("ios");
    expect(getMobilePlatform(FACEBOOK_ANDROID)).toBe("android");
    expect(getMobilePlatform("Mozilla/5.0 (Macintosh)")).toBe("other");
  });
});

describe("buildExternalLoginUrl", () => {
  it("leva redirect_to e params de campanha, URL antes do cookie", () => {
    const url = buildExternalLoginUrl(
      "https://fluizer.com/login?redirect_to=%2Fapp%3Fx%3D1&utm_source=ig&fbclid=abc&wa_token=t",
      { utm_source: "cookie", utm_campaign: "camp", gclid: null },
    );
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/login");
    expect(parsed.searchParams.get("redirect_to")).toBe("/app?x=1");
    expect(parsed.searchParams.get("utm_source")).toBe("ig");
    expect(parsed.searchParams.get("utm_campaign")).toBe("camp");
    expect(parsed.searchParams.get("fbclid")).toBe("abc");
    expect(parsed.searchParams.has("gclid")).toBe(false);
    expect(parsed.searchParams.has("wa_token")).toBe(false);
  });
});

describe("links para o navegador externo", () => {
  const url = "https://fluizer.com/login?utm_source=ig";

  it("intent do Android sem package, com fallback", () => {
    expect(buildAndroidIntentUrl(url)).toBe(
      `intent://fluizer.com/login?utm_source=ig#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(url)};end`,
    );
  });

  it("esquema do Safari no iPhone", () => {
    expect(buildSafariUrl(url)).toBe("x-safari-https://fluizer.com/login?utm_source=ig");
  });
});
