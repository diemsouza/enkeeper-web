import {
  signWaLoginToken,
  WA_LOGIN_TOKEN_MAX_AGE_SEC,
} from "../core/wa-login-token";
import { createShortLink } from "../repo/shortlinks.repo";

export async function buildWaLoginUrl(
  phone: string,
  path: string,
): Promise<string> {
  const token = await signWaLoginToken(phone);
  const url = `${process.env.NEXT_PUBLIC_APP_URL}${path}?wa_token=${token}`;
  const expiresAt = new Date(Date.now() + WA_LOGIN_TOKEN_MAX_AGE_SEC * 1000);
  const shortLink = await createShortLink("wa_redirect", url, expiresAt);
  return `${process.env.NEXT_PUBLIC_APP_URL}/r/${shortLink.code}`;
}
