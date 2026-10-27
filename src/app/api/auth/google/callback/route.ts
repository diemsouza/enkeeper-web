import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  buildGoogleOAuthCookieOptions,
  GOOGLE_OAUTH_COOKIE_NAME,
  verifyGoogleOAuthState,
} from "@/src/core/google-oauth-state";
import { parseAttributionCookie } from "@/src/core/attribution";
import { ATTRIBUTION_COOKIE_NAME } from "@/src/lib/constants";
import { setSessionCookie } from "@/src/lib/auth/session-cookie";
import { completeGoogleLogin } from "@/src/services/google-login-service";
import { GoogleLoginError } from "@/src/lib/custom-errors";
import { sanitizeRedirectPath } from "@/src/core/auth-routes";

export async function GET(request: NextRequest): Promise<Response> {
  const cookieStore = await cookies();
  const oauthState = await verifyGoogleOAuthState(
    cookieStore.get(GOOGLE_OAUTH_COOKIE_NAME)?.value,
  );
  cookieStore.set(GOOGLE_OAUTH_COOKIE_NAME, "", buildGoogleOAuthCookieOptions(0));
  const redirectTo = sanitizeRedirectPath(oauthState?.redirectTo);

  try {
    const { user, isNew } = await completeGoogleLogin({
      callbackParams: request.nextUrl.searchParams,
      oauthState,
      attribution: parseAttributionCookie(
        cookieStore.get(ATTRIBUTION_COOKIE_NAME)?.value,
      ),
    });
    await setSessionCookie(user.id);

    const url = new URL("/login/google", request.url);
    url.searchParams.set("event", isNew ? "sign_up" : "login");
    url.searchParams.set("redirect_to", redirectTo);
    return NextResponse.redirect(url);
  } catch (error: unknown) {
    const code =
      error instanceof GoogleLoginError ? error.code : "GOOGLE_FAILED";
    if (code === "GOOGLE_FAILED") {
      console.error("[get/api/auth/google/callback]", error);
    }
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect_to", redirectTo);
    url.searchParams.set("google_error", code);
    return NextResponse.redirect(url);
  }
}
