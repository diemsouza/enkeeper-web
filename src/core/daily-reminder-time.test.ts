import { describe, expect, it } from "vitest";
import {
  getDailyReminderTimeSlots,
  getNearestReminderTimeSlot,
} from "./daily-reminder-time";

describe("getDailyReminderTimeSlots", () => {
  it("gera 48 slots de 30 em 30 minutos cobrindo as 24h", () => {
    const slots = getDailyReminderTimeSlots();

    expect(slots).toHaveLength(48);
    expect(slots[0]).toBe("00:00");
    expect(slots[1]).toBe("00:30");
    expect(slots[47]).toBe("23:30");
  });

  it("todos os slots têm o formato HH:mm com minutos em :00 ou :30", () => {
    const slots = getDailyReminderTimeSlots();

    for (const slot of slots) {
      expect(slot).toMatch(/^([01]\d|2[0-3]):(00|30)$/);
    }
  });

  it("retorna um array novo a cada chamada", () => {
    expect(getDailyReminderTimeSlots()).not.toBe(getDailyReminderTimeSlots());
    expect(getDailyReminderTimeSlots()).toEqual(getDailyReminderTimeSlots());
  });
});

describe("getNearestReminderTimeSlot", () => {
  const timezone = "America/Sao_Paulo";

  it("arredonda para baixo até o slot de 30 minutos", () => {
    expect(
      getNearestReminderTimeSlot(
        new Date("2026-09-21T23:35:00Z"),
        timezone,
      ),
    ).toBe("20:30");
    expect(
      getNearestReminderTimeSlot(
        new Date("2026-09-21T13:45:00Z"),
        timezone,
      ),
    ).toBe("10:30");
    expect(
      getNearestReminderTimeSlot(
        new Date("2026-09-21T13:15:00Z"),
        timezone,
      ),
    ).toBe("10:00");
  });

  it("mantém o horário quando já está exatamente em um slot", () => {
    expect(
      getNearestReminderTimeSlot(
        new Date("2026-09-21T13:30:00Z"),
        timezone,
      ),
    ).toBe("10:30");
  });

  it("cobre os limites do dia", () => {
    expect(
      getNearestReminderTimeSlot(
        new Date("2026-09-21T03:05:00Z"),
        timezone,
      ),
    ).toBe("00:00");
    expect(
      getNearestReminderTimeSlot(
        new Date("2026-09-22T02:59:00Z"),
        timezone,
      ),
    ).toBe("23:30");
  });

  it("aplica a conversão de timezone recebida", () => {
    const now = new Date("2026-09-21T13:45:00Z");
    expect(getNearestReminderTimeSlot(now, "America/Sao_Paulo")).toBe(
      "10:30",
    );
    expect(getNearestReminderTimeSlot(now, "UTC")).toBe("13:30");
  });
});
