import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeRedirectPath } from "@/src/core/auth-routes";
import {
  buildGoogleOAuthCookieOptions,
  GOOGLE_OAUTH_COOKIE_NAME,
} from "@/src/core/google-oauth-state";
import { startGoogleLogin } from "@/src/services/google-login-service";

const TimezoneSchema = z.string().trim().min(1).max(64);

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const redirectTo = sanitizeRedirectPath(searchParams.get("redirect_to"));
  const timezone = TimezoneSchema.safeParse(searchParams.get("timezone"));

  try {
    const { authUrl, stateToken } = await startGoogleLogin(
      redirectTo,
      timezone.success ? timezone.data : null,
    );
    const res = NextResponse.redirect(authUrl);
    res.cookies.set(
      GOOGLE_OAUTH_COOKIE_NAME,
      stateToken,
      buildGoogleOAuthCookieOptions(),
    );
    return res;
  } catch (error: unknown) {
    console.error("[get/api/auth/google/start]", error);
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect_to", redirectTo);
    url.searchParams.set("google_error", "GOOGLE_FAILED");
    return NextResponse.redirect(url);
  }
}
