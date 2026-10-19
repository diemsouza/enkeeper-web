export const LAST_ACCESS_COOKIE_NAME = "fz_last_access";
const LAST_ACCESS_MAX_AGE_SEC = 365 * 24 * 60 * 60;
const LAST_ACCESS_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export type LastAccessCookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

export function shouldUpdateLastAccess(
  value: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!value) return true;
  const savedAt = Date.parse(value);
  if (Number.isNaN(savedAt)) return true;
  return now.getTime() - savedAt > LAST_ACCESS_REFRESH_THRESHOLD_MS;
}

export function formatLastAccess(now: Date): string {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function buildLastAccessCookieOptions(): LastAccessCookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LAST_ACCESS_MAX_AGE_SEC,
  };
}
