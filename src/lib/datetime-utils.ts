import {
  differenceInCalendarDays,
  format,
  intervalToDuration,
  isSameDay,
  isSameYear,
  isToday,
  isYesterday,
} from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { capitalizeFirst } from "./utils";

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

// Rotulo estilo WhatsApp para a capsula de data do chat: hoje / ontem /
// dia da semana nos ultimos 7 dias / data curta escrita no mesmo ano /
// data completa se for de outro ano.
export function formatDayLabel(date: Date | string, locale?: string): string {
  const d = new Date(date);
  const isPt = locale === "pt-BR";
  const dateFnsLocale = isPt ? ptBR : enUS;

  if (isToday(d)) return isPt ? "Hoje" : "Today";
  if (isYesterday(d)) return isPt ? "Ontem" : "Yesterday";

  const daysAgo = differenceInCalendarDays(new Date(), d);
  if (daysAgo >= 2 && daysAgo < 7) {
    return capitalizeFirst(format(d, "EEEE", { locale: dateFnsLocale }));
  }

  if (isSameYear(d, new Date())) {
    return format(d, isPt ? "d 'de' MMM" : "MMM d", { locale: dateFnsLocale });
  }

  return format(d, isPt ? "dd/MM/yyyy" : "MM/dd/yyyy", {
    locale: dateFnsLocale,
  });
}

export function shouldShowDateSeparator(
  currentIso: string | undefined,
  previousIso: string | undefined,
): boolean {
  if (!currentIso) return false;
  const current = new Date(currentIso);
  if (!previousIso) return !isToday(current);
  return !isSameDay(current, new Date(previousIso));
}
