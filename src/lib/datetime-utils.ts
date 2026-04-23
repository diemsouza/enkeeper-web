import { format, intervalToDuration } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";

export function formatChatDurationShort(start: Date, end: Date) {
  const d = intervalToDuration({ start, end });

  if (d.hours && d.hours > 0) {
    return `${d.hours}h ${d.minutes ?? 0}m`;
  }

  if (d.minutes && d.minutes > 0) {
    return `${d.minutes}m`;
  }

  return `${d.seconds ?? 0}s`;
}

export const normalizeDate = (
  value: string | Date | undefined,
): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
};

export function formatDateTime(
  date?: Date | string,
  locale?: string,
  fallback = "-",
) {
  if (!date) return fallback;
  return format(
    new Date(date),
    locale === "pt-BR" ? "dd/MM/yyyy HH:mm" : "MM/dd/yyyy HH:mm",
    { locale: locale === "pt-BR" ? ptBR : enUS },
  );
}

export function formatDate(
  date?: Date | string,
  locale?: string,
  fallback = "-",
) {
  if (!date) return fallback;
  return format(
    new Date(date),
    locale === "pt-BR" ? "dd/MM/yyyy" : "MM/dd/yyyy",
    { locale: locale === "pt-BR" ? ptBR : enUS },
  );
}
