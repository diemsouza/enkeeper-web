import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const SESSION_COOKIE_NAME = "fz_session";
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export type SessionPayload = { userId: string };

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
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    // jwtVerify lança pra assinatura inválida, token expirado ou malformado —
    // todos tratados igualmente como "sem sessão válida", nunca propagados.
    return null;
  }
}

export function getSessionMaxAgeSec(): number {
  return SESSION_MAX_AGE_SEC;
}
