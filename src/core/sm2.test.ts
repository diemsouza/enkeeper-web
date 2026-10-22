import { describe, expect, it } from "vitest";
import { calcSm2 } from "./sm2";

describe("calcSm2", () => {
  it("acerto sobe o fator e avança o intervalo", () => {
    const result = calcSm2(2.5, 1, null, "right", false);
    expect(result?.easeFactor).toBeCloseTo(2.6);
    expect(result?.interval).toBe(3);
  });

  it("acerto com alternativa mantém o fator e ainda avança o intervalo", () => {
    const result = calcSm2(1.3, 1, null, "right", true);
    expect(result?.easeFactor).toBeCloseTo(1.3);
    expect(result?.interval).toBe(1);
    const next = calcSm2(1.6, 1, null, "right", true);
    expect(next?.easeFactor).toBeCloseTo(1.6);
    expect(next?.interval).toBe(2);
  });

  it("parcial e erro derrubam o fator e voltam em 1 dia", () => {
    expect(calcSm2(2.5, 3, null, "partial", false)?.easeFactor).toBeCloseTo(
      2.35,
    );
    expect(calcSm2(2.5, 3, null, "wrong", false)?.easeFactor).toBeCloseTo(2.3);
    expect(calcSm2(2.5, 3, null, "wrong", false)?.interval).toBe(1);
  });

  it("fator nunca fica abaixo de 1.3", () => {
    expect(calcSm2(1.35, 1, null, "wrong", false)?.easeFactor).toBe(1.3);
  });

  it("não recalcula antes da revisão vencer", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    expect(calcSm2(2.5, 1, future, "right", false)).toBeNull();
  });
});
