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
