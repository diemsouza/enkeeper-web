"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import getUnicodeFlagIcon from "country-flag-icons/unicode";
import BR_FLAG from "country-flag-icons/string/3x2/BR";
import { formatPhoneForInput, removeDigitNextToCaret } from "@/src/core/phone";
import { DEFAULT_PHONE_COUNTRY } from "@/src/lib/constants";
import { cn } from "@/src/lib/utils";

type CountryOption = { code: CountryCode; label: string };

const DELETE_DIRECTIONS: Partial<Record<string, "backward" | "forward">> = {
  deleteContentBackward: "backward",
  deleteContentForward: "forward",
};

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onValueChange: (value: string) => void;
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
};

function buildCountryOptions(): CountryOption[] {
  const names = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  const options = getCountries().map((code) => ({
    code,
    name: names.of(code) ?? code,
    label: `${getUnicodeFlagIcon(code)} ${names.of(code) ?? code} +${getCountryCallingCode(code)}`,
  }));
  options.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const first = options.filter((o) => o.code === DEFAULT_PHONE_COUNTRY);
  const rest = options.filter((o) => o.code !== DEFAULT_PHONE_COUNTRY);
  return [...first, ...rest].map(({ code, label }) => ({ code, label }));
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function caretIndexAfterDigits(text: string, digitCount: number): number {
  if (digitCount === 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]) && ++seen === digitCount) return i + 1;
  }
  return text.length;
}

function CountryFlag({ country }: { country: CountryCode }) {
  const [svg, setSvg] = useState(BR_FLAG);

  useEffect(() => {
    if (country === "BR") {
      setSvg(BR_FLAG);
      return;
    }
    let isCancelled = false;
    void (async () => {
      const flags: Record<string, string> =
        await import("country-flag-icons/string/3x2");
      if (!isCancelled && flags[country]) setSvg(flags[country]);
    })();
    return () => {
      isCancelled = true;
    };
  }, [country]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={svgDataUrl(svg)}
      alt=""
      aria-hidden="true"
      className="h-4 w-6 rounded-[2px] object-cover"
    />
  );
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput(
    { value, onValueChange, country, onCountryChange, className, ...props },
    ref,
  ) {
    const t = useTranslations("common.phone_input");
    const inputRef = useRef<HTMLInputElement>(null);
    const pendingCaretDigitsRef = useRef<number | null>(null);
    const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);

    // Nomes de pais via Intl variam entre Node e navegador; montar so no
    // cliente evita divergencia de hidratacao.
    useEffect(() => setCountryOptions(buildCountryOptions()), []);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    useLayoutEffect(() => {
      const input = inputRef.current;
      const digitCount = pendingCaretDigitsRef.current;
      pendingCaretDigitsRef.current = null;
      if (!input || digitCount === null || document.activeElement !== input) {
        return;
      }
      const position = caretIndexAfterDigits(value, digitCount);
      input.setSelectionRange(position, position);
    }, [value]);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      const caret = e.target.selectionStart ?? e.target.value.length;
      const deletion =
        DELETE_DIRECTIONS[(e.nativeEvent as InputEvent).inputType];
      const hasSameDigits =
        e.target.value.replace(/\D/g, "") === value.replace(/\D/g, "");
      if (deletion && hasSameDigits) {
        const removed = removeDigitNextToCaret(e.target.value, caret, deletion);
        pendingCaretDigitsRef.current = removed.digitsBeforeCaret;
        applyValue(removed.raw);
        return;
      }
      pendingCaretDigitsRef.current =
        caret >= e.target.value.length
          ? null
          : e.target.value.slice(0, caret).replace(/\D/g, "").length;
      applyValue(e.target.value);
    }

    function applyValue(raw: string) {
      const next = formatPhoneForInput(raw, country);
      if (next.country !== country) onCountryChange(next.country);
      onValueChange(next.value);
    }

    function handleCountryChange(e: ChangeEvent<HTMLSelectElement>) {
      const nextCountry = e.target.value as CountryCode;
      onCountryChange(nextCountry);
      onValueChange(formatPhoneForInput(value, nextCountry).value);
      inputRef.current?.focus();
    }

    const placeholder = (
      getExampleNumber(country, examples)?.formatNational() ?? ""
    ).replace(/\d/g, "0");

    return (
      <div
        className={cn(
          "flex h-12 w-full items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          className,
        )}
      >
        <div className="relative flex h-full shrink-0 items-center gap-1.5 pl-3 pr-2 text-muted-foreground">
          <CountryFlag country={country} />
          <span className="text-base">+{getCountryCallingCode(country)}</span>
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          <select
            aria-label={t("country_aria")}
            value={country}
            onChange={handleCountryChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {countryOptions.length === 0 && (
              <option value={country}>+{getCountryCallingCode(country)}</option>
            )}
            {countryOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <input
          {...props}
          ref={inputRef}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className="h-full min-w-0 flex-1 rounded-r-md bg-transparent pr-3 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
      </div>
    );
  },
);
