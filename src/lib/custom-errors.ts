import { CredentialsSignin } from "next-auth";

export class SafeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeError";
  }
}

export const getErrorMessage = (err: Error, defaultMessage?: string) => {
  if (err.name === "SafeError" && err.message) return err.message;
  return defaultMessage || "";
};

export class EmailVerifiedAuthError extends CredentialsSignin {
  code = "EmailVerifiedAuthError";
}

export class AccessDeniedAuthError extends CredentialsSignin {
  code = "AccessDeniedAuthError";
}

export class UnauthorizedError extends SafeError {
  constructor(message = "Sessão inválida ou expirada.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class OtpInvalidError extends SafeError {
  code = "OTP_INVALID";
  attemptsRemaining?: number;

  constructor(message = "Código inválido.", attemptsRemaining?: number) {
    super(message);
    this.name = "OtpInvalidError";
    this.attemptsRemaining = attemptsRemaining;
  }
}

export class OtpExpiredError extends SafeError {
  code = "OTP_EXPIRED";

  constructor(message = "Código expirado.") {
    super(message);
    this.name = "OtpExpiredError";
  }
}

export class OtpAttemptsExceededError extends SafeError {
  code = "OTP_ATTEMPTS_EXCEEDED";

  constructor(message = "Limite de tentativas esgotado.") {
    super(message);
    this.name = "OtpAttemptsExceededError";
  }
}

export class OtpCooldownError extends SafeError {
  code = "OTP_COOLDOWN";
  retryAfterSec: number;

  constructor(retryAfterSec: number, message = "Aguarde antes de reenviar.") {
    super(message);
    this.name = "OtpCooldownError";
    this.retryAfterSec = retryAfterSec;
  }
}

export class InvalidPhoneError extends SafeError {
  code = "INVALID_PHONE";

  constructor(message = "Telefone inválido.") {
    super(message);
    this.name = "InvalidPhoneError";
  }
}

export type GoogleLoginErrorCode =
  | "GOOGLE_CANCELED"
  | "GOOGLE_EMAIL_UNVERIFIED"
  | "GOOGLE_FAILED";

export class GoogleLoginError extends SafeError {
  code: GoogleLoginErrorCode;

  constructor(code: GoogleLoginErrorCode, message = "Falha no login com Google.") {
    super(message);
    this.name = "GoogleLoginError";
    this.code = code;
  }
}

export class PhoneTakenError extends SafeError {
  code = "PHONE_TAKEN";

  constructor(message = "Telefone já pertence a outra conta.") {
    super(message);
    this.name = "PhoneTakenError";
  }
}
