"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { formatBrPhoneMask, isBrPhoneComplete } from "@/src/lib/utils";

type PhoneStepProps = {
  onSubmit: (digits: string) => void;
  loading: boolean;
  error: string | null;
};

export function PhoneStep({ onSubmit, loading, error }: PhoneStepProps) {
  const [display, setDisplay] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const digits = display.replace(/\D/g, "");
  const isValid = isBrPhoneComplete(display);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || loading) return;
    onSubmit(digits);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-foreground">
          Seu WhatsApp
        </label>
        <Input
          ref={inputRef}
          id="phone"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          value={display}
          onChange={(e) => setDisplay(formatBrPhoneMask(e.target.value))}
          className="h-12 text-base"
        />
        <p className="text-sm text-muted-foreground">
          Vamos te enviar um código de confirmação pelo WhatsApp.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={!isValid || loading}
        className="h-12 text-base"
      >
        {loading ? "Enviando..." : "Continuar"}
      </Button>
    </form>
  );
}
