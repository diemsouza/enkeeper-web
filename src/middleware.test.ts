import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "./middleware";
import { parseAttributionCookie } from "./core/attribution";
import { ATTRIBUTION_COOKIE_NAME } from "./lib/constants";

const BASE = "http://localhost:3000";
const GOOGLE_QUERY =
  "utm_source=google&utm_medium=cpc&utm_campaign=teste1&gclid=TESTE123";

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`${BASE}${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

function readCookie(res: Response) {
  const raw = res.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${ATTRIBUTION_COOKIE_NAME}=`));
  if (!raw) return null;
  const value = decodeURIComponent(
    raw.split(";")[0].split("=").slice(1).join("="),
  );
  return { raw, attribution: parseAttributionCookie(value) };
}

describe("middleware attribution", () => {
  it("captures campaign params on the landing page", async () => {
    const res = await middleware(request(`/?${GOOGLE_QUERY}`));
    const cookie = readCookie(res);
    expect(cookie?.attribution).toMatchObject({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "teste1",
      gclid: "TESTE123",
      landingPath: "/",
    });
    expect(cookie?.raw).toMatch(/HttpOnly/i);
    expect(cookie?.raw).toMatch(/SameSite=lax/i);
    expect(cookie?.raw).toMatch(/Max-Age=7776000/);
  });

  it("captures on /login", async () => {
    const res = await middleware(request(`/login?${GOOGLE_QUERY}`));
    expect(readCookie(res)?.attribution?.utmSource).toBe("google");
  });

  it("captures on the /app redirect and forwards params to the /login root", async () => {
    const res = await middleware(request(`/app?${GOOGLE_QUERY}`));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("utm_source")).toBe("google");
    expect(location.searchParams.get("gclid")).toBe("TESTE123");
    expect(location.searchParams.get("redirect_to")).toContain(
      "utm_source=google",
    );
    expect(readCookie(res)?.attribution?.gclid).toBe("TESTE123");
  });

  function cookieHeader(res: Response): string {
    const stored = encodeURIComponent(
      JSON.stringify(readCookie(res)?.attribution),
    );
    return `${ATTRIBUTION_COOKIE_NAME}=${stored}`;
  }

  it("overwrites an existing cookie when the request carries new campaign params", async () => {
    const first = await middleware(request(`/?${GOOGLE_QUERY}`));
    const second = await middleware(
      request("/?utm_source=meta&utm_medium=cpc", cookieHeader(first)),
    );
    expect(readCookie(second)?.attribution).toMatchObject({
      utmSource: "meta",
      utmMedium: "cpc",
      gclid: null,
    });
  });

  it("replaces an empty cookie when a later visit carries utm", async () => {
    const empty = await middleware(request("/"));
    const res = await middleware(
      request(`/?${GOOGLE_QUERY}`, cookieHeader(empty)),
    );
    expect(readCookie(res)?.attribution?.utmSource).toBe("google");
  });

  it("keeps the last campaign when a later visit has no params", async () => {
    const first = await middleware(request(`/?${GOOGLE_QUERY}`));
    const second = await middleware(request("/login", cookieHeader(first)));
    expect(readCookie(second)).toBeNull();
  });
});
