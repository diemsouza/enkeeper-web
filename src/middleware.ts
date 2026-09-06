import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./core/session-token";

export async function middleware(req: NextRequest) {
  if (process.env.DISABLE_LANDING_PAGE === "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const { pathname } = req.nextUrl;
  const isAppRoute = pathname.startsWith("/app");
  const isLoginRoute = pathname === "/login";
  if (!isAppRoute && !isLoginRoute) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (isAppRoute && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isLoginRoute && session) {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
