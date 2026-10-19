import { describe, expect, it } from "vitest";
import { formatLastAccess, shouldUpdateLastAccess } from "./last-access";

describe("shouldUpdateLastAccess", () => {
  const now = new Date("2026-10-19T16:28:00Z");

  it("cookie ausente, atualiza", () => {
    expect(shouldUpdateLastAccess(undefined, now)).toBe(true);
    expect(shouldUpdateLastAccess("", now)).toBe(true);
  });

  it("valor com menos de 24 horas, não atualiza", () => {
    expect(shouldUpdateLastAccess("2026-10-18T16:29:00Z", now)).toBe(false);
  });

  it("valor com mais de 24 horas, atualiza", () => {
    expect(shouldUpdateLastAccess("2026-10-18T16:27:00Z", now)).toBe(true);
  });

  it("valor inválido, atualiza", () => {
    expect(shouldUpdateLastAccess("not-a-date", now)).toBe(true);
  });
});

describe("formatLastAccess", () => {
  it("gera ISO 8601 UTC sem milissegundos", () => {
    expect(formatLastAccess(new Date("2026-10-19T16:28:00.123Z"))).toBe(
      "2026-10-19T16:28:00Z",
    );
  });
});
