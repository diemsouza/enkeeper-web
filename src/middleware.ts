import { NextRequest, NextResponse } from "next/server";
import { isProtectedPath, sanitizeRedirectPath } from "./core/auth-routes";
import {
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
  shouldRefreshSession,
  signSessionToken,
  verifySessionToken,
} from "./core/session-token";

export async function middleware(req: NextRequest) {
  if (process.env.DISABLE_LANDING_PAGE === "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { pathname, search } = req.nextUrl;
  const isAppRoute = isProtectedPath(pathname);
  const isLoginRoute = pathname === "/login";
  if (!isAppRoute && !isLoginRoute) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (isAppRoute && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect_to", pathname + search);
    return NextResponse.redirect(url);
  }

  const res =
    isLoginRoute && session
      ? NextResponse.redirect(
          new URL(
            sanitizeRedirectPath(req.nextUrl.searchParams.get("redirect_to")),
            req.url,
          ),
        )
      : NextResponse.next();

  if (session && shouldRefreshSession(session.issuedAt)) {
    const fresh = await signSessionToken({ userId: session.userId });
    res.cookies.set(SESSION_COOKIE_NAME, fresh, buildSessionCookieOptions());
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
