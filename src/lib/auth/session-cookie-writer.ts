import {
  buildLastAccessCookieOptions,
  formatLastAccess,
  LAST_ACCESS_COOKIE_NAME,
  shouldUpdateLastAccess,
  type LastAccessCookieOptions,
} from "../../core/last-access";
import {
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
  type SessionCookieOptions,
} from "../../core/session-token";

type CookieWriter = {
  set(
    name: string,
    value: string,
    options: SessionCookieOptions | LastAccessCookieOptions,
  ): unknown;
};

// Unico ponto que grava a sessao: rotas de login (next/headers) e renovacao
// no middleware (res.cookies) passam por aqui.
export async function writeSessionCookies(
  target: CookieWriter,
  userId: string,
  currentLastAccess: string | undefined,
  now: Date = new Date(),
): Promise<void> {
  const token = await signSessionToken({ userId });
  target.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions());
  if (!shouldUpdateLastAccess(currentLastAccess, now)) return;
  target.set(
    LAST_ACCESS_COOKIE_NAME,
    formatLastAccess(now),
    buildLastAccessCookieOptions(),
  );
}
