import { describe, expect, it } from "vitest";
import {
  isOtpExhausted,
  isOtpExpired,
  isOtpResendAllowed,
  otpResendCooldownRemainingSec,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SEC,
} from "./otp";

describe("isOtpResendAllowed", () => {
  it("sem código anterior, sempre permite", () => {
    expect(isOtpResendAllowed(null, new Date())).toBe(true);
  });

  it("dentro da janela de cooldown, bloqueia", () => {
    const now = new Date("2026-01-01T00:00:29Z");
    const lastCreatedAt = new Date("2026-01-01T00:00:00Z");
    expect(isOtpResendAllowed(lastCreatedAt, now)).toBe(false);
  });

  it("após a janela de cooldown, permite", () => {
    const now = new Date("2026-01-01T00:00:31Z");
    const lastCreatedAt = new Date("2026-01-01T00:00:00Z");
    expect(isOtpResendAllowed(lastCreatedAt, now)).toBe(true);
  });
});

describe("otpResendCooldownRemainingSec", () => {
  it("sem código anterior, zero", () => {
    expect(otpResendCooldownRemainingSec(null, new Date())).toBe(0);
  });

  it("no meio da janela, retorna o restante arredondado pra cima", () => {
    const now = new Date("2026-01-01T00:00:10Z");
    const lastCreatedAt = new Date("2026-01-01T00:00:00Z");
    expect(otpResendCooldownRemainingSec(lastCreatedAt, now)).toBe(
      OTP_RESEND_COOLDOWN_SEC - 10,
    );
  });

  it("depois da janela, nunca fica negativo", () => {
    const now = new Date("2026-01-01T01:00:00Z");
    const lastCreatedAt = new Date("2026-01-01T00:00:00Z");
    expect(otpResendCooldownRemainingSec(lastCreatedAt, now)).toBe(0);
  });
});

describe("isOtpExpired", () => {
  it("expira quando now passou de expiresAt", () => {
    const expiresAt = new Date("2026-01-01T00:10:00Z");
    const now = new Date("2026-01-01T00:10:01Z");
    expect(isOtpExpired(expiresAt, now)).toBe(true);
  });

  it("não expira antes de expiresAt", () => {
    const expiresAt = new Date("2026-01-01T00:10:00Z");
    const now = new Date("2026-01-01T00:09:59Z");
    expect(isOtpExpired(expiresAt, now)).toBe(false);
  });
});

describe("isOtpExhausted", () => {
  it("abaixo do limite, não esgotado", () => {
    expect(isOtpExhausted(OTP_MAX_ATTEMPTS - 1)).toBe(false);
  });

  it("no limite, esgotado", () => {
    expect(isOtpExhausted(OTP_MAX_ATTEMPTS)).toBe(true);
  });
});
