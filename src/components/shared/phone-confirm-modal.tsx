"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { PhoneStep } from "@/src/app/login/phone-step";
import { CodeStep } from "@/src/app/login/code-step";
import {
  otpErrorMessage,
  requestOtpCode,
  type OtpErrorBody,
} from "@/src/app/login/otp-client";
import { postJson } from "@/src/lib/api-client";

type PhoneConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle: string;
  onConfirmed: () => void;
};

// Cadastra e confirma o número na conta logada; reusa o envio de código do
// login, mas a confirmação grava o número sem trocar de sessão.
export function PhoneConfirmModal({
  open,
  onOpenChange,
  title,
  subtitle,
  onConfirmed,
}: PhoneConfirmModalProps): React.JSX.Element {
  const t = useTranslations("login");
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [requestedAt, setRequestedAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  function reset(): void {
    setStep("phone");
    setPhone("");
    setRequestedAt(0);
    setLoading(false);
    setPhoneError(null);
    setCodeError(null);
  }

  function handleOpenChange(next: boolean): void {
    if (!next) reset();
    onOpenChange(next);
  }

  async function requestCode(nextPhone: string): Promise<void> {
    setPhoneError(null);
    setLoading(true);
    const result = await requestOtpCode(nextPhone, t);
    setLoading(false);
    if (!result.ok) {
      setPhoneError(result.message);
      return;
    }
    setPhone(nextPhone);
    setRequestedAt(result.requestedAt);
    setStep("code");
  }

  async function resendCode(): Promise<void> {
    setCodeError(null);
    const result = await requestOtpCode(phone, t);
    if (!result.ok) {
      setCodeError(result.message);
      return;
    }
    setRequestedAt(result.requestedAt);
  }

  async function verifyCode(code: string): Promise<void> {
    setLoading(true);
    setCodeError(null);
    const { ok, body } = await postJson<OtpErrorBody>(
      "/api/app/account/phone",
      { phone, code },
    );
    setLoading(false);
    if (!ok) {
      setCodeError(otpErrorMessage(t, body));
      return;
    }
    reset();
    router.refresh();
    onConfirmed();
  }

  function changeNumber(): void {
    setStep("phone");
    setPhone("");
    setCodeError(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        {step === "phone" ? (
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
      </DialogContent>
    </Dialog>
  );
}
