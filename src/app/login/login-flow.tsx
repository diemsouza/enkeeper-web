"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Button } from "@/src/components/ui/button";
import { CampaignParams } from "@/src/core/embedded-browser";
import { GoogleButton } from "./google-button";
import { EmbeddedBrowserStep } from "./embedded-browser-step";
import { startGoogleLogin } from "./google-login";
import {
  otpErrorMessage,
  requestOtpCode,
  type OtpErrorBody,
  type OtpRequestResult,
} from "./otp-client";

type VerifyOtpBody = OtpErrorBody & { isNew?: boolean; userId?: string };

type LoginStep = "options" | "phone" | "code";

type LoginHeaderProps = {
  checkingWaToken: boolean;
  step: LoginStep;
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

type LoginOptionsProps = {
  error: string | null;
  onGoogle: () => void;
  onPhone: () => void;
};

function LoginOptions({ error, onGoogle, onPhone }: LoginOptionsProps) {
  const t = useTranslations("login");
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <GoogleButton onClick={onGoogle} />
      <Button
        type="button"
        variant="outline"
        onClick={onPhone}
        className="w-full"
      >
        {t("phone_continue")}
      </Button>
    </div>
  );
}

function LegalNotice() {
  const t = useTranslations("login");
  return (
    <footer className="mx-auto w-full max-w-sm py-4 text-center text-xs text-muted-foreground">
      {t.rich("legal_notice", {
        terms: (chunks) => (
          <Link href="/terms" className="underline underline-offset-2">
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link href="/privacy" className="underline underline-offset-2">
            {chunks}
          </Link>
        ),
      })}
    </footer>
  );
}

type LoginFlowProps = {
  hasAccessedBefore: boolean;
  campaignParams: CampaignParams;
};

export function LoginFlow({ hasAccessedBefore, campaignParams }: LoginFlowProps) {
  const t = useTranslations("login");
  const [step, setStep] = useState<LoginStep>("options");
  const [phone, setPhone] = useState("");
  const [requestedAt, setRequestedAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingWaToken, setCheckingWaToken] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [externalLoginUrl, setExternalLoginUrl] = useState<string | null>(
    null,
  );

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
    const code = new URLSearchParams(window.location.search).get(
      "google_error",
    );
    if (!code) return;
    const key = `errors.${code}`;
    setGoogleError(t.has(key) ? t(key) : t("errors.GOOGLE_FAILED"));
  }, [t]);

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

  async function submitRequest(nextPhone: string): Promise<OtpRequestResult> {
    setLoading(true);
    const result = await requestOtpCode(nextPhone, t);
    setLoading(false);
    if (result.ok) saveOtpRequest(nextPhone, result.requestedAt);
    return result;
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
      setCodeError(otpErrorMessage(t, body));
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
        className="flex min-h-[100dvh] flex-col bg-background px-6"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 0rem)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <main className="flex flex-1 flex-col items-center justify-center gap-8">
          {externalLoginUrl ? (
            <EmbeddedBrowserStep
              loginUrl={externalLoginUrl}
              onUseWhatsApp={() => {
                setExternalLoginUrl(null);
                setStep("phone");
              }}
            />
          ) : (
            <>
              <LoginHeader
                checkingWaToken={checkingWaToken}
                step={step}
                hasAccessedBefore={hasAccessedBefore}
              />
              {checkingWaToken ? (
                <Spinner size="lg" />
              ) : step === "options" ? (
                <LoginOptions
                  error={googleError}
                  onGoogle={() =>
                    startGoogleLogin(campaignParams, setExternalLoginUrl)
                  }
                  onPhone={() => setStep("phone")}
                />
              ) : step === "phone" ? (
                <PhoneStep
                  onSubmit={requestCode}
                  loading={loading}
                  error={phoneError}
                  onBack={() => {
                    setPhoneError(null);
                    setStep("options");
                  }}
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
            </>
          )}
        </main>
        {!checkingWaToken && <LegalNotice />}
      </div>
    </>
  );
}
