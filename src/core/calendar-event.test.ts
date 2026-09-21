import { describe, expect, it } from "vitest";
import {
  buildGoogleCalendarUrl,
  buildIcsFileContent,
  type CalendarEventInput,
} from "./calendar-event";

const baseInput: CalendarEventInput = {
  time: "19:00",
  appUrl: "https://fluizer.com/app",
  now: new Date(2026, 2, 15, 8, 0, 0),
  eventTitle: "Praticar inglês no Fluizer",
  eventDescription: "Sua prática diária de inglês. Acesse: https://fluizer.com/app",
};

describe("buildGoogleCalendarUrl", () => {
  it("monta a URL de template com os parâmetros corretos", () => {
    const url = new URL(buildGoogleCalendarUrl(baseInput));

    expect(url.origin + url.pathname).toBe(
      "https://calendar.google.com/calendar/render",
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe(baseInput.eventTitle);
    expect(url.searchParams.get("details")).toBe(baseInput.eventDescription);
    expect(url.searchParams.get("location")).toBe(baseInput.appUrl);
    expect(url.searchParams.get("recur")).toBe("RRULE:FREQ=DAILY");
  });

  it("usa o horário informado no dia de now, sem sufixo Z (floating local time)", () => {
    const url = new URL(buildGoogleCalendarUrl(baseInput));
    const [start, end] = (url.searchParams.get("dates") ?? "").split("/");

    expect(start).toBe("20260315T190000");
    expect(end).toBe("20260315T193000");
    expect(start.endsWith("Z")).toBe(false);
    expect(end.endsWith("Z")).toBe(false);
  });
});

describe("buildIcsFileContent", () => {
  it("gera um .ics com título, descrição, local e recorrência diária", () => {
    const ics = buildIcsFileContent(baseInput);

    expect(ics).toContain("SUMMARY:Praticar inglês no Fluizer");
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("LOCATION:https://fluizer.com/app");
  });

  it("gera DTSTART em floating time, sem Z e sem TZID", () => {
    const ics = buildIcsFileContent(baseInput);
    const dtstartLine = ics
      .split(/\r?\n/)
      .find((line) => line.startsWith("DTSTART"));

    expect(dtstartLine).toBe("DTSTART:20260315T190000");
  });
});
