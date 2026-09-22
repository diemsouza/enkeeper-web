import { NextRequest, NextResponse } from "next/server";
import { isProtectedPath, sanitizeRedirectPath } from "./core/auth-routes";
import { buildAttributionCookie } from "./core/attribution";
import {
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
  shouldRefreshSession,
  signSessionToken,
  verifySessionToken,
} from "./core/session-token";
import {
  ATTRIBUTION_COOKIE_MAX_AGE_DAYS,
  ATTRIBUTION_COOKIE_NAME,
} from "./lib/constants";
import { getUtmParams } from "./lib/utm-utils";

function captureAttribution(req: NextRequest, res: NextResponse): void {
  if (req.cookies.get(ATTRIBUTION_COOKIE_NAME)) return;

  const { utmSource, utmMedium, utmCampaign, utmContent, utmTerm, gclid, fbclid } =
    getUtmParams(req.nextUrl.toString());
  const cookie = buildAttributionCookie(
    {
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      gclid,
      fbclid,
      referrer: req.headers.get("referer"),
      landingPath: req.nextUrl.pathname,
    },
    new Date(),
  );

  res.cookies.set(ATTRIBUTION_COOKIE_NAME, JSON.stringify(cookie), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ATTRIBUTION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export async function middleware(req: NextRequest) {
  if (process.env.DISABLE_LANDING_PAGE === "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { pathname, search } = req.nextUrl;
  const isAppRoute = isProtectedPath(pathname);
  const isLoginRoute = pathname === "/login";
  if (!isAppRoute && !isLoginRoute) {
    const res = NextResponse.next();
    captureAttribution(req, res);
    return res;
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (isAppRoute && !session) {
    const url = new URL("/login", req.url);
    const waToken = req.nextUrl.searchParams.get("wa_token");
    const cleanParams = new URLSearchParams(search);
    cleanParams.delete("wa_token");
    const cleanSearch = cleanParams.toString();
    url.searchParams.set(
      "redirect_to",
      pathname + (cleanSearch ? `?${cleanSearch}` : ""),
    );
    if (waToken) url.searchParams.set("wa_token", waToken);
    return NextResponse.redirect(url);
  }

  const hasWaToken = req.nextUrl.searchParams.has("wa_token");

  let res: NextResponse;
  if (isLoginRoute && session) {
    res = NextResponse.redirect(
      new URL(
        sanitizeRedirectPath(req.nextUrl.searchParams.get("redirect_to")),
        req.url,
      ),
    );
  } else if (isAppRoute && session && hasWaToken) {
    const cleanParams = new URLSearchParams(search);
    cleanParams.delete("wa_token");
    const url = new URL(pathname, req.url);
    url.search = cleanParams.toString();
    res = NextResponse.redirect(url);
  } else {
    res = NextResponse.next();
  }

  if (session && shouldRefreshSession(session.issuedAt)) {
    const fresh = await signSessionToken({ userId: session.userId });
    res.cookies.set(SESSION_COOKIE_NAME, fresh, buildSessionCookieOptions());
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
