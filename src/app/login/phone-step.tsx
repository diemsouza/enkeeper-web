"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { CountryCode } from "libphonenumber-js";
import { Button } from "@/src/components/ui/button";
import { PhoneInput } from "@/src/components/shared/phone-input";
import { toE164 } from "@/src/core/phone";
import { DEFAULT_PHONE_COUNTRY } from "@/src/lib/constants";

type PhoneStepProps = {
  onSubmit: (phone: string) => void;
  loading: boolean;
  error: string | null;
};

export function PhoneStep({ onSubmit, loading, error }: PhoneStepProps) {
  const t = useTranslations("login");
  const [display, setDisplay] = useState("");
  const [country, setCountry] = useState<CountryCode>(DEFAULT_PHONE_COUNTRY);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleValueChange(value: string) {
    setDisplay(value);
    setValidationError(null);
  }

  // Le o valor do DOM, nao o estado: autofill pode preencher o campo sem
  // passar pelo onChange em alguns navegadores.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const phone = toE164(inputRef.current?.value ?? display, country);
    if (!phone) {
      setValidationError(t("phone_invalid"));
      return;
    }
    onSubmit(phone);
  }

  const visibleError = validationError ?? error;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-foreground">
          {t("phone_label")}
        </label>
        <PhoneInput
          ref={inputRef}
          id="phone"
          name="phone"
          value={display}
          onValueChange={handleValueChange}
          country={country}
          onCountryChange={setCountry}
          aria-invalid={visibleError ? true : undefined}
          aria-describedby="phone-hint"
        />
        <p id="phone-hint" className="text-sm text-muted-foreground">
          {t("phone_hint")}
        </p>
      </div>
      {visibleError && (
        <p className="text-sm text-destructive">{visibleError}</p>
      )}
      <Button type="submit" disabled={loading} className="h-12 text-base">
        {loading ? t("sending") : t("send_code")}
      </Button>
      <p className="text-sm text-muted-foreground">
        {t("phone_usage_note")}
      </p>
    </form>
  );
}
