import type { Prisma } from "../lib/prisma";

export function hasPhonePrompted(metadata: Prisma.JsonValue | null): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }
  return typeof metadata.phonePromptedAt === "string";
}
