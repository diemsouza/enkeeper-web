import { Waitlist } from "../lib/prisma";
import { prisma } from "../lib/prisma";

export async function findWaitlistByPhone(phone: string): Promise<Waitlist | null> {
  return prisma.waitlist.findUnique({ where: { phone } });
}

export async function createWaitlistEntry(name: string, phone: string): Promise<Waitlist> {
  return prisma.waitlist.create({ data: { name, phone } });
}

export async function markWaitlistActive(phone: string): Promise<void> {
  await prisma.waitlist.update({ where: { phone }, data: { status: "active" } });
}
