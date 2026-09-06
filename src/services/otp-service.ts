import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { normalizePhoneToWaId } from "../core/phone";
import {
  isOtpExhausted,
  isOtpExpired,
  isOtpResendAllowed,
  otpResendCooldownRemainingSec,
  OTP_EXPIRATION_MIN,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SEC,
} from "../core/otp";
import {
  consumeOtpCode,
  createOtpCode,
  findLatestOtpCode,
  incrementOtpAttempts,
} from "../repo/otp.repo";
import { sendOtpCode } from "../vendors/otp.vendor";
import { findOrCreateUserByChannel } from "./user-service";
import { USER_SOURCE } from "../lib/constants";
import { User } from "../lib/prisma";
import {
  InvalidPhoneError,
  OtpAttemptsExceededError,
  OtpCooldownError,
  OtpExpiredError,
  OtpInvalidError,
} from "../lib/custom-errors";

const OTP_CODE_LENGTH = 6;

function generateOtpCode(): string {
  if (process.env.AUTH_FAKE_OTP === "true")
    return process.env.AUTH_FAKE_OTP_CODE ?? "123456";
  const max = 10 ** OTP_CODE_LENGTH;
  return randomInt(0, max).toString().padStart(OTP_CODE_LENGTH, "0");
}

export async function requestOtp(
  rawPhone: string,
): Promise<{ cooldownSec: number }> {
  const phone = normalizePhoneToWaId(rawPhone);
  if (!phone) throw new InvalidPhoneError();

  const now = new Date();
  const latest = await findLatestOtpCode(phone);
  const lastCreatedAt = latest?.createdAt ?? null;
  if (!isOtpResendAllowed(lastCreatedAt, now)) {
    throw new OtpCooldownError(
      otpResendCooldownRemainingSec(lastCreatedAt, now),
    );
  }

  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(now.getTime() + OTP_EXPIRATION_MIN * 60 * 1000);
  await createOtpCode(phone, codeHash, expiresAt);
  await sendOtpCode(phone, code);

  return { cooldownSec: OTP_RESEND_COOLDOWN_SEC };
}

export async function verifyOtp(
  rawPhone: string,
  code: string,
): Promise<{ user: User }> {
  const phone = normalizePhoneToWaId(rawPhone);
  if (!phone) throw new InvalidPhoneError();

  const otp = await findLatestOtpCode(phone);
  if (!otp || otp.consumedAt) throw new OtpInvalidError();

  const now = new Date();
  if (isOtpExhausted(otp.attemptsUsed)) throw new OtpAttemptsExceededError();
  if (isOtpExpired(otp.expiresAt, now)) throw new OtpExpiredError();

  const matches = await bcrypt.compare(code, otp.codeHash);
  if (!matches) {
    await incrementOtpAttempts(otp.id);
    const attemptsRemaining = Math.max(
      0,
      OTP_MAX_ATTEMPTS - (otp.attemptsUsed + 1),
    );
    throw new OtpInvalidError("Código inválido.", attemptsRemaining);
  }

  await consumeOtpCode(otp.id);

  const { user } = await findOrCreateUserByChannel(
    "whatsapp",
    phone,
    phone,
    undefined,
    undefined,
    USER_SOURCE.SITE,
    { via: "web_otp_login" },
  );

  return { user };
}
