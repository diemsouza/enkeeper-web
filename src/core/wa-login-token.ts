import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

export const WA_LOGIN_TOKEN_MAX_AGE_SEC = 24 * 60 * 60;

export type WaLoginPayload = { phone: string };

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

export async function signWaLoginToken(phone: string): Promise<string> {
  return new SignJWT({ phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${WA_LOGIN_TOKEN_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifyWaLoginToken(
  token: string,
): Promise<WaLoginPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.phone !== "string") return null;
    return { phone: payload.phone };
  } catch (err) {
    // jwtVerify lança pra assinatura inválida, token expirado ou malformado —
    // todos tratados igualmente como "sem login automático", nunca propagados.
    console.error(
      "[verifyWaLoginToken] verify failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
