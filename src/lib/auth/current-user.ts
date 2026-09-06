import { cookies } from "next/headers";
import { verifySessionToken } from "../../core/session-token";
import { findUserById } from "../../repo/users.repo";
import { User } from "../prisma";
import { UnauthorizedError } from "../custom-errors";
import { SESSION_COOKIE_NAME } from "./session-cookie";

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (!session) return null;

  return findUserById(session.userId);
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
