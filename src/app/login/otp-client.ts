import type { TAnyEnv } from "@/src/i18n/types";
import { postJson } from "@/src/lib/api-client";

export type OtpErrorBody = {
  error?: string;
  code?: string;
  retryAfterSec?: number;
  attemptsRemaining?: number;
};

export type OtpRequestResult =
  | { ok: true; requestedAt: number }
  | { ok: false; message: string };

// t precisa estar no namespace "login".
export function otpErrorMessage(t: TAnyEnv, body: OtpErrorBody): string {
  const key = `errors.${body.code}`;
  if (body.code && t.has(key)) return t(key);
  return body.error || t("errors.generic");
}

export async function requestOtpCode(
  phone: string,
  t: TAnyEnv,
): Promise<OtpRequestResult> {
  const { ok, body } = await postJson<OtpErrorBody>("/api/auth/otp/request", {
    phone,
  });
  if (!ok) return { ok: false, message: otpErrorMessage(t, body) };
  return { ok: true, requestedAt: Date.now() };
}
