import { cookies } from "next/headers";
import { LAST_ACCESS_COOKIE_NAME } from "../../core/last-access";
import { SESSION_COOKIE_NAME } from "../../core/session-token";
import { writeSessionCookies } from "./session-cookie-writer";

export { SESSION_COOKIE_NAME };

export async function setSessionCookie(userId: string): Promise<void> {
  const cookieStore = await cookies();
  await writeSessionCookies(
    cookieStore,
    userId,
    cookieStore.get(LAST_ACCESS_COOKIE_NAME)?.value,
  );
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
