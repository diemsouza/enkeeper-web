import { Prisma, ShortLink } from "../lib/prisma";
import { prisma } from "../lib/prisma";
import { generateShortId } from "../lib/shortid";

const MAX_CREATE_ATTEMPTS = 5;

export async function createShortLink(
  kind: string,
  url: string,
  expiresAt: Date,
): Promise<ShortLink> {
  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
    try {
      return await prisma.shortLink.create({
        data: { code: generateShortId(), kind, url, expiresAt },
      });
    } catch (err) {
      const isCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002";
      if (!isCollision || attempt === MAX_CREATE_ATTEMPTS) throw err;
    }
  }
  throw new Error("[createShortLink] unreachable");
}

export async function resolveShortLink(code: string): Promise<string | null> {
  const shortLink = await prisma.shortLink.findUnique({ where: { code } });
  if (!shortLink || shortLink.expiresAt < new Date()) return null;
  await prisma.shortLink.update({
    where: { id: shortLink.id },
    data: { accessCount: { increment: 1 }, lastAccessAt: new Date() },
  });
  return shortLink.url;
}

export async function deleteExpiredShortLinks(
  threshold: Date,
): Promise<number> {
  const result = await prisma.shortLink.deleteMany({
    where: { expiresAt: { lt: threshold } },
  });
  return result.count;
}
