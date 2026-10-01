import { describe, expect, it } from "vitest";
import { daysSince, pickEngagementReminder } from "./engagement-reminder";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("daysSince", () => {
  it("conta dias completos desde a última interação", () => {
    const now = new Date("2026-10-10T20:00:00Z");

    expect(daysSince(new Date(now.getTime() - 1000), now)).toBe(0);
    expect(daysSince(new Date(now.getTime() - DAY_MS), now)).toBe(1);
    expect(daysSince(new Date(now.getTime() - 7 * DAY_MS + 1000), now)).toBe(6);
    expect(daysSince(new Date(now.getTime() - 7 * DAY_MS), now)).toBe(7);
  });
});

describe("pickEngagementReminder", () => {
  const pick = (
    daysInactive: number,
    isReminderEnabled = true,
    eligibleCount = 0,
  ): ReturnType<typeof pickEngagementReminder> =>
    pickEngagementReminder({ daysInactive, isReminderEnabled, eligibleCount });

  it("de 0 a 6 dias envia lembrete conforme revisão elegível", () => {
    for (let day = 0; day <= 6; day++) {
      expect(pick(day, true, 3)).toBe("daily_reminder_revision");
      expect(pick(day, true, 0)).toBe("daily_reminder_v2");
    }
  });

  it("de 0 a 6 dias não envia nada com lembrete desativado", () => {
    for (let day = 0; day <= 6; day++) {
      expect(pick(day, false, 3)).toBeNull();
    }
  });

  it("dias 7 e 14 enviam nudge independente do toggle", () => {
    expect(pick(7, false)).toBe("nudge_days");
    expect(pick(7, true, 5)).toBe("nudge_days");
    expect(pick(14, false)).toBe("nudge_days");
  });

  it("de 8 a 13 e a partir de 15 não envia nada", () => {
    for (const day of [8, 10, 13, 15, 30]) {
      expect(pick(day, true, 5)).toBeNull();
    }
  });
});
