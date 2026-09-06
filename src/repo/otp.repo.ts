import { OtpCode, prisma } from "../lib/prisma";

export async function createOtpCode(
  phone: string,
  codeHash: string,
  expiresAt: Date,
): Promise<OtpCode> {
  return prisma.otpCode.create({
    data: { phone, codeHash, expiresAt },
  });
}

export async function findLatestOtpCode(
  phone: string,
): Promise<OtpCode | null> {
  return prisma.otpCode.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
  });
}

export async function incrementOtpAttempts(id: string): Promise<void> {
  await prisma.otpCode.update({
    where: { id },
    data: { attemptsUsed: { increment: 1 } },
  });
}

export async function consumeOtpCode(id: string): Promise<void> {
  await prisma.otpCode.update({
    where: { id },
    data: { consumedAt: new Date() },
  });
}
