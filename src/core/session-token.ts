import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE_NAME = "fz_session";
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;
const SESSION_REFRESH_THRESHOLD_SEC = 24 * 60 * 60;

export type SessionPayload = { userId: string };

export type VerifiedSession = { userId: string; issuedAt: number };

export type SessionCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
  expires: Date;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<VerifiedSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string") return null;
    const issuedAt = typeof payload.iat === "number" ? payload.iat : 0;
    return { userId: payload.userId, issuedAt };
  } catch (err) {
    // jwtVerify lança pra assinatura inválida, token expirado ou malformado —
    // todos tratados igualmente como "sem sessão válida", nunca propagados.
    console.error(
      "[verifySessionToken] verify failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export function getSessionMaxAgeSec(): number {
  return SESSION_MAX_AGE_SEC;
}

export function buildSessionCookieOptions(): SessionCookieOptions {
  const maxAge = getSessionMaxAgeSec();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  };
}

export function shouldRefreshSession(
  issuedAt: number,
  now: Date = new Date(),
): boolean {
  const nowSec = Math.floor(now.getTime() / 1000);
  return nowSec - issuedAt > SESSION_REFRESH_THRESHOLD_SEC;
}
