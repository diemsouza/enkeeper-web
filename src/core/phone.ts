import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber,
  validatePhoneNumberLength,
} from "libphonenumber-js";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_NATIONAL_FORMAT_OVERRIDES,
  PHONE_NATIONAL_LENGTH_OVERRIDES,
} from "../lib/constants";

// Marcas de direcao de texto e BOM que vem junto ao copiar de contatos.
const INVISIBLE_CHARS = /[‎‏‪-‮⁦-⁩﻿]/g;

export type ParsedPhone = {
  country: CountryCode;
  callingCode: string;
  nationalNumber: string;
};

export function cleanPhoneInput(raw: string): string {
  return raw.replace(INVISIBLE_CHARS, "").replace(/ /g, " ").trim();
}

function isAcceptedPhone(phone: PhoneNumber | undefined): phone is PhoneNumber {
  if (!phone?.country) return false;
  const lengths = PHONE_NATIONAL_LENGTH_OVERRIDES[phone.country];
  if (lengths) return lengths.includes(phone.nationalNumber.length);
  return phone.isValid();
}

function toParsedPhone(phone: PhoneNumber | undefined): ParsedPhone | null {
  if (!isAcceptedPhone(phone) || !phone.country) return null;
  return {
    country: phone.country,
    callingCode: phone.countryCallingCode,
    nationalNumber: phone.nationalNumber,
  };
}

function parseInternational(digits: string): ParsedPhone | null {
  return toParsedPhone(parsePhoneNumberFromString(`+${digits}`));
}

// Nacional antes do internacional: DDD 55 existe, entao "55 98765-4321" e
// numero nacional, nao DDI. Sem "+", o DDI so e reconhecido se for o do pais
// selecionado ("5511987654321" vindo de autofill ou contato).
export function parsePhoneInput(
  raw: string,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): ParsedPhone | null {
  const clean = cleanPhoneInput(raw);
  const digits = clean.replace(/\D/g, "");
  if (!digits) return null;
  if (clean.startsWith("+")) return parseInternational(digits);
  if (clean.startsWith("00")) return parseInternational(digits.slice(2));

  const national = toParsedPhone(parsePhoneNumberFromString(digits, country));
  if (national) return national;
  if (!digits.startsWith(getCountryCallingCode(country))) return null;
  return parseInternational(digits);
}

export function normalizePhoneToWaId(
  raw: string,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const parsed = parsePhoneInput(raw, country);
  return parsed ? `${parsed.callingCode}${parsed.nationalNumber}` : null;
}

export function toE164(
  raw: string,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const waId = normalizePhoneToWaId(raw, country);
  return waId ? `+${waId}` : null;
}

function toPhoneNumber(parsed: ParsedPhone): PhoneNumber | undefined {
  return parsePhoneNumberFromString(
    `+${parsed.callingCode}${parsed.nationalNumber}`,
  );
}

function formatNationalNumber(parsed: ParsedPhone): string {
  const formatted =
    toPhoneNumber(parsed)?.formatNational() ?? parsed.nationalNumber;
  if (/\D/.test(formatted)) return formatted;
  const override =
    PHONE_NATIONAL_FORMAT_OVERRIDES[parsed.country]?.[
      parsed.nationalNumber.length
    ];
  return override
    ? parsed.nationalNumber.replace(override.pattern, override.format)
    : formatted;
}

function trimToMaxLength(
  digits: string,
  plus: string,
  country: CountryCode,
): string {
  let trimmed = digits;
  while (
    trimmed &&
    validatePhoneNumberLength(`${plus}${trimmed}`, country) === "TOO_LONG"
  ) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

// Apagar sobre "(", ")", espaco ou "-" nao muda os digitos e a mascara volta
// igual; nesse caso o digito vizinho na direcao da tecla sai junto.
export function removeDigitNextToCaret(
  raw: string,
  caret: number,
  direction: "backward" | "forward",
): { raw: string; digitsBeforeCaret: number } {
  const plus = raw.trimStart().startsWith("+") ? "+" : "";
  const digits = raw.replace(/\D/g, "");
  const before = raw.slice(0, caret).replace(/\D/g, "").length;
  const removeAt = direction === "backward" ? before - 1 : before;
  if (removeAt < 0 || removeAt >= digits.length) {
    return { raw: `${plus}${digits}`, digitsBeforeCaret: before };
  }
  return {
    raw: `${plus}${digits.slice(0, removeAt)}${digits.slice(removeAt + 1)}`,
    digitsBeforeCaret: direction === "backward" ? before - 1 : before,
  };
}

export function formatPhoneForInput(
  raw: string,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): { value: string; country: CountryCode } {
  const parsed = parsePhoneInput(raw, country);
  if (!parsed) {
    const clean = cleanPhoneInput(raw);
    const plus = clean.startsWith("+") ? "+" : "";
    const digits = clean.replace(/\D/g, "");
    const trimmed = trimToMaxLength(digits, plus, country);
    if (trimmed !== digits)
      return formatPhoneForInput(`${plus}${trimmed}`, country);
    return { value: new AsYouType(country).input(`${plus}${digits}`), country };
  }
  return { value: formatNationalNumber(parsed), country: parsed.country };
}

export function formatPhoneForDisplay(raw: string): string {
  const parsed = parsePhoneInput(raw);
  if (!parsed) return raw;
  const phone = toPhoneNumber(parsed);
  if (!phone) return raw;
  return parsed.country === DEFAULT_PHONE_COUNTRY
    ? formatNationalNumber(parsed)
    : phone.formatInternational();
}
