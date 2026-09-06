const OTP_SESSION_KEY = "fluizer_otp_pending";

export type PendingOtpRequest = { phone: string; requestedAt: number };

export function saveOtpRequest(phone: string, requestedAt: number): void {
  try {
    sessionStorage.setItem(
      OTP_SESSION_KEY,
      JSON.stringify({ phone, requestedAt }),
    );
  } catch {
    // sessionStorage pode lançar em modo privado de alguns navegadores;
    // sem persistência o refresh só volta pro passo telefone, não quebra.
  }
}

export function readOtpRequest(): PendingOtpRequest | null {
  try {
    const raw = sessionStorage.getItem(OTP_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingOtpRequest>;
    if (typeof parsed.phone !== "string" || typeof parsed.requestedAt !== "number") {
      return null;
    }
    return { phone: parsed.phone, requestedAt: parsed.requestedAt };
  } catch {
    return null;
  }
}

export function clearOtpRequest(): void {
  try {
    sessionStorage.removeItem(OTP_SESSION_KEY);
  } catch {
    // ver saveOtpRequest
  }
}
