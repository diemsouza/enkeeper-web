import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { JSONType } from "./json-type";
import { format } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getFormattedPrice = (price: number, currency: string) => {
  const numberFormat = new Intl.NumberFormat(
    currency === "BRL" ? "pt-BR" : "en-US",
    {
      minimumFractionDigits: 2,
      currency: currency,
    },
  );
  return numberFormat.format(price);
};

export async function safeCall<T>(
  promise: Promise<T>,
): Promise<[T | null, Error | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (err: any) {
    return [null, err];
  }
}

export function sanitizeText(text: string) {
  return text.replace("<has_function_call>", "");
}

export function extractUrls(text: string): string[] {
  // const matches = Autolinker.parse(text, {
  //   stripPrefix: false,
  // });
  // return matches
  //   .map((match) => match.getAnchorHref())
  //   .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicados
  const urlRegex = /\bhttps?:\/\/[^\s<>"'()]+\b/g;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches)); // Remove duplicados
}

export function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
}

export function sanitizeWhatsAppText(text: string): string {
  return text
    .replace(/[\r\n\t]+/g, " ") // remove quebras de linha e tabs
    .replace(/\s{4,}/g, "  ") // limita espaços consecutivos a no máximo 2
    .trim();
}

export function fmtMoney(
  cents?: number | null,
  currency = "BRL",
  locale = "pt-BR",
) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency,
  });
}

export function fmtCents(
  cents?: number | null,
  currency = "BRL",
  locale = "pt-BR",
) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency,
  });
}

export function fmtBRDate(d?: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(d);
}

export function safeParseOrigin(input?: string | null): string {
  if (!input) return "";
  try {
    const url = new URL(input);
    // normaliza sem trailing slash para comparação
    return url.origin.replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function isAllowedDomain(
  originUrl: string,
  allowedDomains: string[],
): boolean {
  if (!Array.isArray(allowedDomains) || allowedDomains.length === 0)
    return true;
  if (!originUrl) return false;
  // normalize ambos
  const o = originUrl.toLowerCase();
  return allowedDomains.some(
    (d) =>
      o === d.toLowerCase().replace(/\/$/, "") ||
      o.startsWith(d.toLowerCase().replace(/\/$/, "")),
  );
}

export function splitEmails(value: string): string[] {
  return value
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isWhatsAppNumber(phone: string): boolean {
  // Remove tudo que não for dígito
  const digits = phone.replace(/\D/g, "");

  // Regras internacionais E.164:
  // - Mínimo 7 dígitos (ex: números curtos em alguns países)
  // - Máximo 15 dígitos (padrão ITU-T E.164)
  if (digits.length < 11 || digits.length > 15) {
    return false;
  }

  // Valida formato com ou sem código do país
  // Aceita: +1234567890, 1234567890, 00 1234567890
  const pattern = /^\+?(\d{1,3})?[\s\-.]?(\(?\d{1,4}\)?[\s\-.]?){1,4}\d{4}$/;

  return pattern.test(phone.trim());
}

export function getWhatsappUrl(whatsappNumber: string): string {
  return `https://wa.me/${whatsappNumber?.replaceAll("/\D/g", "")}`;
}

export function validateHttpsUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
