import { cookies } from "next/headers";
import {
  buildSessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "../../core/session-token";

export { SESSION_COOKIE_NAME };

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await signSessionToken({ userId });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, buildSessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
