import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const GOOGLE_OAUTH_COOKIE_NAME = "fz_google_oauth";
export const GOOGLE_OAUTH_COOKIE_PATH = "/api/auth/google";
const GOOGLE_OAUTH_STATE_MAX_AGE_SEC = 10 * 60;

export type GoogleOAuthState = {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectTo: string;
  timezone: string | null;
};

export type GoogleOAuthCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

// sameSite lax: o retorno do Google é navegação de topo (GET), então o cookie vai junto.
export function buildGoogleOAuthCookieOptions(
  maxAge = GOOGLE_OAUTH_STATE_MAX_AGE_SEC,
): GoogleOAuthCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: GOOGLE_OAUTH_COOKIE_PATH,
    maxAge,
  };
}

export async function signGoogleOAuthState(
  payload: GoogleOAuthState,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${GOOGLE_OAUTH_STATE_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export async function verifyGoogleOAuthState(
  token: string | undefined,
): Promise<GoogleOAuthState | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const { state, nonce, codeVerifier, redirectTo, timezone } = payload;
    if (![state, nonce, codeVerifier, redirectTo].every(isString)) return null;
    return {
      state: state as string,
      nonce: nonce as string,
      codeVerifier: codeVerifier as string,
      redirectTo: redirectTo as string,
      timezone: isString(timezone) ? timezone : null,
    };
  } catch (err) {
    // Assinatura inválida, expirado ou malformado: login recomeça do zero.
    console.error(
      "[verifyGoogleOAuthState] verify failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
