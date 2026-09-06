export const OTP_EXPIRATION_MIN = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SEC = 30;

export function isOtpResendAllowed(
  lastCreatedAt: Date | null,
  now: Date,
): boolean {
  if (!lastCreatedAt) return true;
  return otpResendCooldownRemainingSec(lastCreatedAt, now) <= 0;
}

export function otpResendCooldownRemainingSec(
  lastCreatedAt: Date | null,
  now: Date,
): number {
  if (!lastCreatedAt) return 0;
  const elapsedSec = (now.getTime() - lastCreatedAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(OTP_RESEND_COOLDOWN_SEC - elapsedSec));
}

export function isOtpExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt < now;
}

export function isOtpExhausted(attemptsUsed: number): boolean {
  return attemptsUsed >= OTP_MAX_ATTEMPTS;
}
