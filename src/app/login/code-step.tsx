"use client";

import { useEffect, useState } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/src/components/ui/input-otp";
import { otpResendCooldownRemainingSec } from "@/src/core/otp";
import { cn, formatBrPhoneMask } from "@/src/lib/utils";

type CodeStepProps = {
  phoneDigits: string;
  requestedAt: number;
  loading: boolean;
  error: string | null;
  onVerify: (code: string) => void;
  onResend: () => void;
  onChangeNumber: () => void;
};

function remainingCooldown(requestedAt: number): number {
  return otpResendCooldownRemainingSec(new Date(requestedAt), new Date());
}

export function CodeStep({
  phoneDigits,
  requestedAt,
  loading,
  error,
  onVerify,
  onResend,
  onChangeNumber,
}: CodeStepProps) {
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(() => remainingCooldown(requestedAt));
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    setRemaining(remainingCooldown(requestedAt));
  }, [requestedAt]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => {
      setRemaining(remainingCooldown(requestedAt));
    }, 1000);
    return () => clearTimeout(timer);
  }, [remaining, requestedAt]);

  useEffect(() => {
    if (!error) return;
    setCode("");
    setResetKey((k) => k + 1);
  }, [error]);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <p className="text-center text-sm text-muted-foreground">
        Digite o código de 6 dígitos enviado por WhatsApp para{" "}
        <span className="font-medium text-foreground">
          {formatBrPhoneMask(phoneDigits)}
        </span>
      </p>
      <InputOTP
        key={resetKey}
        maxLength={6}
        value={code}
        onChange={setCode}
        onComplete={onVerify}
        autoFocus
        disabled={loading}
      >
        <InputOTPGroup>
          {Array.from({ length: 6 }).map((_, i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className={cn("h-12 w-11", error && "border-destructive")}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
          Verificando código...
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={onChangeNumber}
          className="h-11 px-2 text-muted-foreground underline underline-offset-2"
        >
          Trocar número
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={remaining > 0}
          className="h-11 px-2 text-muted-foreground underline underline-offset-2 disabled:no-underline disabled:opacity-50"
        >
          {remaining > 0 ? `Reenviar em ${remaining}s` : "Reenviar código"}
        </button>
      </div>
    </div>
  );
}
