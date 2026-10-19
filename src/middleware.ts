import { NextRequest, NextResponse } from "next/server";
import { isProtectedPath, sanitizeRedirectPath } from "./core/auth-routes";
import { buildAttributionCookie } from "./core/attribution";
import {
  LAST_ACCESS_COOKIE_NAME,
  shouldUpdateLastAccess,
} from "./core/last-access";
import {
  SESSION_COOKIE_NAME,
  shouldRefreshSession,
  verifySessionToken,
} from "./core/session-token";
import { writeSessionCookies } from "./lib/auth/session-cookie-writer";
import {
  ATTRIBUTION_COOKIE_MAX_AGE_DAYS,
  ATTRIBUTION_COOKIE_NAME,
} from "./lib/constants";
import {
  CAMPAIGN_PARAM_KEYS,
  getUtmParams,
  hasCampaignParams,
} from "./lib/utm-utils";

// Last-touch: params de campanha na URL sempre substituem o cookie; sem eles,
// o cookie existente e preservado.
function captureAttribution(req: NextRequest, res: NextResponse): void {
  const utmParams = getUtmParams(req.nextUrl.toString());
  if (!hasCampaignParams(utmParams) && req.cookies.get(ATTRIBUTION_COOKIE_NAME))
    return;

  const {
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    gclid,
    fbclid,
  } = utmParams;
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

// O GA4 le a campanha da URL da pagina: sem repassar para a raiz, o redirect
// /app -> /login deixa os params so dentro de redirect_to e a sessao perde a origem.
function forwardCampaignParams(source: URLSearchParams, target: URL): void {
  for (const key of CAMPAIGN_PARAM_KEYS) {
    const value = source.get(key);
    if (value) target.searchParams.set(key, value);
  }
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
    forwardCampaignParams(req.nextUrl.searchParams, url);
    const redirect = NextResponse.redirect(url);
    captureAttribution(req, redirect);
    return redirect;
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

  captureAttribution(req, res);

  const lastAccess = req.cookies.get(LAST_ACCESS_COOKIE_NAME)?.value;
  // Sessoes anteriores ao fz_last_access ganham o cookie no proximo acesso,
  // sem esperar a renovacao do token.
  if (
    session &&
    (shouldRefreshSession(session.issuedAt) ||
      shouldUpdateLastAccess(lastAccess))
  ) {
    await writeSessionCookies(res.cookies, session.userId, lastAccess);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt).*)",
  ],
};
