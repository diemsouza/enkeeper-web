"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Nav from "@/src/components/home/nav";
import { Spinner } from "@/src/components/ui/spinner";
import { PhoneStep } from "./phone-step";
import { CodeStep } from "./code-step";
import { postJson } from "@/src/lib/api-client";
import { OTP_EXPIRATION_MIN } from "@/src/core/otp";
import { clearOtpRequest, readOtpRequest, saveOtpRequest } from "./otp-session";
import { sanitizeRedirectPath } from "@/src/core/auth-routes";
import { setUserId, track } from "@/src/lib/analytics";

type OtpErrorBody = {
  error?: string;
  code?: string;
  retryAfterSec?: number;
  attemptsRemaining?: number;
};

type VerifyOtpBody = OtpErrorBody & { isNew?: boolean; userId?: string };

type LoginHeaderProps = {
  checkingWaToken: boolean;
  step: "phone" | "code";
  hasAccessedBefore: boolean;
};

function LoginHeader({
  checkingWaToken,
  step,
  hasAccessedBefore,
}: LoginHeaderProps) {
  const t = useTranslations("login");
  if (checkingWaToken || step === "code") {
    return (
      <h1 className="text-xl font-semibold text-foreground">
        {checkingWaToken ? t("loading") : t("code_title")}
      </h1>
    );
  }
  const variant = hasAccessedBefore ? "returning" : "new";
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2 text-center">
      <h1 className="text-xl font-semibold text-foreground">
        {t(`title_${variant}`)}
      </h1>
      <p className="text-base text-muted-foreground">
        {t(`subtitle_${variant}`)}
      </p>
    </div>
  );
}

type RequestResult =
  | { ok: true; requestedAt: number }
  | { ok: false; message: string };

type LoginFlowProps = { hasAccessedBefore: boolean };

export function LoginFlow({ hasAccessedBefore }: LoginFlowProps) {
  const t = useTranslations("login");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [requestedAt, setRequestedAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingWaToken, setCheckingWaToken] = useState(false);

  function messageFor(body: OtpErrorBody): string {
    const key = `errors.${body.code}`;
    if (body.code && t.has(key)) return t(key);
    return body.error || t("errors.generic");
  }

  useEffect(() => {
    const waToken = new URLSearchParams(window.location.search).get("wa_token");
    if (!waToken) return;
    setCheckingWaToken(true);
    (async () => {
      const { ok, body } = await postJson<{ ok: boolean; userId?: string }>(
        "/api/auth/wa-login",
        { waToken },
      );
      if (ok && body.ok) {
        if (body.userId) setUserId(body.userId);
        track("login", { method: "whatsapp" });
        const target = new URLSearchParams(window.location.search).get(
          "redirect_to",
        );
        window.location.replace(sanitizeRedirectPath(target));
        return;
      }
      setCheckingWaToken(false);
    })();
  }, []);

  useEffect(() => {
    const pending = readOtpRequest();
    if (!pending) return;

    const elapsedMs = Date.now() - pending.requestedAt;
    if (elapsedMs >= OTP_EXPIRATION_MIN * 60_000) {
      clearOtpRequest();
      return;
    }

    setPhone(pending.phone);
    setRequestedAt(pending.requestedAt);
    setStep("code");
  }, []);

  async function submitRequest(nextPhone: string): Promise<RequestResult> {
    setLoading(true);
    const { ok, body } = await postJson<OtpErrorBody>("/api/auth/otp/request", {
      phone: nextPhone,
    });
    setLoading(false);
    if (!ok) return { ok: false, message: messageFor(body) };
    const now = Date.now();
    saveOtpRequest(nextPhone, now);
    return { ok: true, requestedAt: now };
  }

  async function requestCode(nextPhone: string) {
    setPhoneError(null);
    const result = await submitRequest(nextPhone);
    if (!result.ok) {
      setPhoneError(result.message);
      return;
    }
    setPhone(nextPhone);
    setRequestedAt(result.requestedAt);
    setStep("code");
  }

  async function resendCode() {
    setCodeError(null);
    const result = await submitRequest(phone);
    if (!result.ok) {
      setCodeError(result.message);
      return;
    }
    setRequestedAt(result.requestedAt);
  }

  async function verifyCode(code: string) {
    setLoading(true);
    setCodeError(null);
    const { ok, body } = await postJson<VerifyOtpBody>("/api/auth/otp/verify", {
      phone,
      code,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    setLoading(false);
    if (!ok) {
      if (body.code === "OTP_EXPIRED") clearOtpRequest();
      setCodeError(messageFor(body));
      return;
    }
    clearOtpRequest();
    if (body.userId) setUserId(body.userId);
    track(body.isNew ? "sign_up" : "login", { method: "phone" });
    const target = new URLSearchParams(window.location.search).get(
      "redirect_to",
    );
    window.location.replace(sanitizeRedirectPath(target));
  }

  function changeNumber() {
    clearOtpRequest();
    setStep("phone");
    setCodeError(null);
    setPhone("");
  }

  return (
    <>
      <Nav hasLoginLink={false} />
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-background px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 0rem)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <LoginHeader
          checkingWaToken={checkingWaToken}
          step={step}
          hasAccessedBefore={hasAccessedBefore}
        />
        {checkingWaToken ? (
          <Spinner size="lg" />
        ) : step === "phone" ? (
          <PhoneStep
            onSubmit={requestCode}
            loading={loading}
            error={phoneError}
          />
        ) : (
          <CodeStep
            phone={phone}
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
