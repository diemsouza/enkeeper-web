import {
  signWaLoginToken,
  WA_LOGIN_TOKEN_MAX_AGE_SEC,
} from "../core/wa-login-token";
import { createShortLink } from "../repo/shortlinks.repo";
import {
  findUserByIdentifier,
  findUserSignedLink,
  updateUserSignedLink,
} from "../repo/users.repo";

type WaLoginLink = { url: string; code: string; expiresAt: Date };

function buildShortLinkUrl(code: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/r/${code}`;
}

async function buildWaLoginUrl(
  phone: string,
  path: string,
): Promise<WaLoginLink> {
  const token = await signWaLoginToken(phone);
  const url = `${process.env.NEXT_PUBLIC_APP_URL}${path}?wa_token=${token}`;
  const expiresAt = new Date(Date.now() + WA_LOGIN_TOKEN_MAX_AGE_SEC * 1000);
  const shortLink = await createShortLink("wa_redirect", url, expiresAt);
  return {
    url: buildShortLinkUrl(shortLink.code),
    code: shortLink.code,
    expiresAt,
  };
}

// Reaproveita o shortlink ainda válido salvo no User para não gerar token novo
// a cada mensagem solta recebida dentro da mesma janela de 24h.
export async function getOrCreateWaLoginUrl(
  userId: string,
  phone: string,
): Promise<string> {
  const cached = await findUserSignedLink(userId);
  if (cached && new Date(cached.signedLinkExpiresAt) > new Date()) {
    return buildShortLinkUrl(cached.signedLinkToken);
  }

  const link = await buildWaLoginUrl(phone, "/login");
  await updateUserSignedLink(userId, {
    signedLinkToken: link.code,
    signedLinkExpiresAt: link.expiresAt.toISOString(),
  });
  return link.url;
}

// Número sem conta (ou não identificável, ex: BSUID/username da Meta) recebe o
// link fixo do app, que cai no login por telefone e código.
export async function resolveWhatsAppAccessLink(
  phone: string | null,
): Promise<string> {
  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/app`;
  if (!phone) return appUrl;

  const user = await findUserByIdentifier("web", phone);
  if (!user) return appUrl;
  return getOrCreateWaLoginUrl(user.id, phone);
}
