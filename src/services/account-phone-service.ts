import { Prisma } from "../lib/prisma";
import { PhoneTakenError } from "../lib/custom-errors";
import { findUserByPhone, updateUserPhone } from "../repo/users.repo";
import { consumeOtp } from "./otp-service";

// Cadastro de número na conta logada (ex: conta criada pelo Google). O código
// é conferido antes de olhar o dono do número: checar no envio deixaria
// qualquer conta descobrir se um número tem conta no Fluizer.
export async function confirmAccountPhone(
  userId: string,
  rawPhone: string,
  code: string,
): Promise<void> {
  const phone = await consumeOtp(rawPhone, code);
  const owner = await findUserByPhone(phone);
  if (owner && owner.id !== userId) throw new PhoneTakenError();

  try {
    await updateUserPhone(userId, phone);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new PhoneTakenError();
    }
    throw err;
  }
}
