import { cookies } from "next/headers";
import {
  getSessionMaxAgeSec,
  SESSION_COOKIE_NAME,
  signSessionToken,
} from "../../core/session-token";

export { SESSION_COOKIE_NAME };

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await signSessionToken({ userId });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSec(),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
