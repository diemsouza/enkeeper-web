import { signWaLoginToken } from "./wa-login-token";

export async function buildWaLoginUrl(
  phone: string,
  path: string,
): Promise<string> {
  const token = await signWaLoginToken(phone);
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}?wa_token=${token}`;
}
