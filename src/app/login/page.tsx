"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Nav from "@/src/components/home/nav";
import { PhoneStep } from "./phone-step";
import { CodeStep } from "./code-step";
import { postJson } from "@/src/lib/api-client";
import { OTP_EXPIRATION_MIN } from "@/src/core/otp";
import { clearOtpRequest, readOtpRequest, saveOtpRequest } from "./otp-session";
import { sanitizeRedirectPath } from "@/src/core/auth-routes";

type OtpErrorBody = {
  error?: string;
  code?: string;
  retryAfterSec?: number;
  attemptsRemaining?: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  OTP_INVALID: "Código inválido.",
  OTP_EXPIRED: "Código expirado. Peça um novo.",
  OTP_ATTEMPTS_EXCEEDED: "Muitas tentativas. Peça um novo código.",
  OTP_COOLDOWN: "Aguarde antes de pedir outro código.",
  INVALID_PHONE: "Número de telefone inválido.",
};

function messageFor(body: OtpErrorBody): string {
  return (
    (body.code && ERROR_MESSAGES[body.code]) ||
    body.error ||
    "Algo deu errado, tenta de novo."
  );
}

type RequestResult =
  | { ok: true; requestedAt: number }
  | { ok: false; message: string };

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [requestedAt, setRequestedAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    const pending = readOtpRequest();
    if (!pending) return;

    const elapsedMs = Date.now() - pending.requestedAt;
    if (elapsedMs >= OTP_EXPIRATION_MIN * 60_000) {
      clearOtpRequest();
      return;
    }

    setPhoneDigits(pending.phone);
    setRequestedAt(pending.requestedAt);
    setStep("code");
  }, []);

  async function submitRequest(digits: string): Promise<RequestResult> {
    setLoading(true);
    const { ok, body } = await postJson<OtpErrorBody>(
      "/api/auth/otp/request",
      { phone: digits },
    );
    setLoading(false);
    if (!ok) return { ok: false, message: messageFor(body) };
    const now = Date.now();
    saveOtpRequest(digits, now);
    return { ok: true, requestedAt: now };
  }

  async function requestCode(digits: string) {
    setPhoneError(null);
    const result = await submitRequest(digits);
    if (!result.ok) {
      setPhoneError(result.message);
      return;
    }
    setPhoneDigits(digits);
    setRequestedAt(result.requestedAt);
    setStep("code");
  }

  async function resendCode() {
    setCodeError(null);
    const result = await submitRequest(phoneDigits);
    if (!result.ok) {
      setCodeError(result.message);
      return;
    }
    setRequestedAt(result.requestedAt);
  }

  async function verifyCode(code: string) {
    setLoading(true);
    setCodeError(null);
    const { ok, body } = await postJson<OtpErrorBody>(
      "/api/auth/otp/verify",
      { phone: phoneDigits, code },
    );
    setLoading(false);
    if (!ok) {
      if (body.code === "OTP_EXPIRED") clearOtpRequest();
      setCodeError(messageFor(body));
      return;
    }
    clearOtpRequest();
    const target = new URLSearchParams(window.location.search).get("redirect_to");
    router.replace(sanitizeRedirectPath(target));
  }

  function changeNumber() {
    clearOtpRequest();
    setStep("phone");
    setCodeError(null);
    setPhoneDigits("");
  }

  return (
    <>
      <Nav />
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-background px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 5rem)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <h1 className="text-xl font-semibold text-foreground">
          Entrar no Fluizer
        </h1>
        {step === "phone" ? (
          <PhoneStep
            onSubmit={requestCode}
            loading={loading}
            error={phoneError}
          />
        ) : (
          <CodeStep
            phoneDigits={phoneDigits}
            requestedAt={requestedAt}
            loading={loading}
            error={codeError}
            onVerify={verifyCode}
            onResend={resendCode}
            onChangeNumber={changeNumber}
          />
        )}
      </div>
    </>
  );
}
