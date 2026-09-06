import { describe, expect, it } from "vitest";
import { normalizePhoneToWaId } from "./phone";

describe("normalizePhoneToWaId", () => {
  it("celular BR de 11 dígitos sem DDI ganha prefixo 55", () => {
    expect(normalizePhoneToWaId("11999999999")).toBe("5511999999999");
  });

  it("fixo BR de 10 dígitos sem DDI ganha prefixo 55", () => {
    expect(normalizePhoneToWaId("1133334444")).toBe("551133334444");
  });

  it("já com DDI 55 permanece igual", () => {
    expect(normalizePhoneToWaId("5511999999999")).toBe("5511999999999");
  });

  it("com +55 remove o símbolo e mantém DDI", () => {
    expect(normalizePhoneToWaId("+5511999999999")).toBe("5511999999999");
  });

  it("com espaços, traços e parênteses normaliza igual", () => {
    expect(normalizePhoneToWaId("(11) 99999-9999")).toBe("5511999999999");
  });

  it("DDI diferente de 55 no comprimento de 12 dígitos é inválido", () => {
    expect(normalizePhoneToWaId("119999999999")).toBe(null);
  });

  it("curto demais é inválido", () => {
    expect(normalizePhoneToWaId("999999")).toBe(null);
  });

  it("longo demais é inválido", () => {
    expect(normalizePhoneToWaId("551199999999999999")).toBe(null);
  });
});
