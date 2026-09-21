import { createEvent, type EventAttributes } from "ics";

export const CALENDAR_EVENT_DURATION_MIN = 30;

export type CalendarEventInput = {
  time: string;
  appUrl: string;
  now: Date;
  eventTitle: string;
  eventDescription: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const { time, appUrl, now, eventTitle, eventDescription } = input;
  const { hours, minutes } = parseTime(time);

  const start = new Date(now);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(
    start.getTime() + CALENDAR_EVENT_DURATION_MIN * 60 * 1000,
  );

  const localStamp = (d: Date): string =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: eventTitle,
    // Sem sufixo "Z": o Google Calendar interpreta os timestamps no fuso local
    // de quem abre o link, o que é o comportamento certo para um lembrete
    // diário recorrente (um instante UTC fixo quebraria em DST ou noutro fuso).
    dates: `${localStamp(start)}/${localStamp(end)}`,
    details: eventDescription,
    location: appUrl,
    recur: "RRULE:FREQ=DAILY",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildIcsEventAttributes(
  input: CalendarEventInput,
): EventAttributes {
  const { time, now, eventTitle, eventDescription, appUrl } = input;
  const { hours, minutes } = parseTime(time);

  return {
    title: eventTitle,
    description: eventDescription,
    location: appUrl,
    start: [now.getFullYear(), now.getMonth() + 1, now.getDate(), hours, minutes],
    duration: { minutes: CALENDAR_EVENT_DURATION_MIN },
    recurrenceRule: "FREQ=DAILY",
    startInputType: "local",
    // Floating time (sem "Z"/TZID): mesmo raciocínio de fuso do link do
    // Google, o default da lib é "utc" e travaria o evento num instante fixo.
    startOutputType: "local",
  };
}

export function buildIcsFileContent(input: CalendarEventInput): string {
  const { error, value } = createEvent(buildIcsEventAttributes(input));
  if (error || !value) {
    throw new Error("Falha ao gerar arquivo .ics");
  }
  return value;
}
