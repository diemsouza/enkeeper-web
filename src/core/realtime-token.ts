import { SignJWT } from "jose/jwt/sign";

const REALTIME_TOKEN_MAX_AGE_SEC = 60 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET não configurado");
  return new TextEncoder().encode(secret);
}

// Token auxiliar só pra autorizar o canal Realtime do Supabase (RLS exige
// auth.jwt() ->> 'sub'). Não é a sessão do app, que continua sendo o cookie
// assinado por src/core/session-token.ts.
export async function signRealtimeToken(userId: string): Promise<string> {
  return new SignJWT({ role: "authenticated" })
    .setSubject(userId)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REALTIME_TOKEN_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}
