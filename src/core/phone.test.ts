import { describe, expect, it } from "vitest";
import {
  formatPhoneForDisplay,
  formatPhoneForInput,
  normalizePhoneToWaId,
  parsePhoneInput,
  removeDigitNextToCaret,
  toE164,
} from "./phone";

describe("normalizePhoneToWaId", () => {
  it("celular BR de 11 dígitos sem DDI ganha prefixo 55", () => {
    expect(normalizePhoneToWaId("11999999999")).toBe("5511999999999");
  });

  it("fixo BR de 10 dígitos sem DDI ganha prefixo 55", () => {
    expect(normalizePhoneToWaId("1133334444")).toBe("551133334444");
  });

  it("celular BR sem o nono dígito continua aceito como veio", () => {
    expect(normalizePhoneToWaId("1187654321")).toBe("551187654321");
    expect(normalizePhoneToWaId("551187654321")).toBe("551187654321");
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

  it("DDD 55 sem DDI é número nacional, não DDI", () => {
    expect(normalizePhoneToWaId("55987654321")).toBe("5555987654321");
  });

  it("wa_id do webhook com + mantém o número", () => {
    expect(normalizePhoneToWaId("+5511987654321")).toBe("5511987654321");
    expect(normalizePhoneToWaId("+14155552671")).toBe("14155552671");
  });

  it("12 dígitos sem DDI do país selecionado é inválido", () => {
    expect(normalizePhoneToWaId("119999999999")).toBe(null);
  });

  it("curto demais é inválido", () => {
    expect(normalizePhoneToWaId("999999")).toBe(null);
  });

  it("longo demais é inválido", () => {
    expect(normalizePhoneToWaId("551199999999999999")).toBe(null);
  });

  it("vazio é inválido", () => {
    expect(normalizePhoneToWaId("")).toBe(null);
    expect(normalizePhoneToWaId("   ")).toBe(null);
  });

  it("incompleto é inválido", () => {
    expect(normalizePhoneToWaId("1198765")).toBe(null);
    expect(normalizePhoneToWaId("(11) 98765-43")).toBe(null);
  });

  it("9 dígitos sem DDD é inválido", () => {
    expect(normalizePhoneToWaId("98765-4321")).toBe(null);
  });
});

describe("formatos de entrada do login", () => {
  const brFormats = [
    "11987654321",
    "(11) 98765-4321",
    "11 98765-4321",
    "+55 11 98765-4321",
    "+55 (11) 98765-4321",
    "5511987654321",
    "011 98765-4321",
    "11.98765.4321",
    "11 98765 4321",
    "+55 11 98765-4321",
    "‪+55 11 98765-4321‬",
    "‎+55 11 98765‑4321".replace("‑", "-"),
    "⁦(11) 98765-4321⁩",
    "﻿+55 11 98765-4321",
  ];

  it.each(brFormats)("%j vira (11) 98765-4321", (raw) => {
    expect(formatPhoneForInput(raw)).toEqual({
      value: "(11) 98765-4321",
      country: "BR",
    });
    expect(normalizePhoneToWaId(raw)).toBe("5511987654321");
    expect(toE164(raw)).toBe("+5511987654321");
  });
});

describe("outros países", () => {
  it("número dos EUA colado com + troca o país", () => {
    expect(parsePhoneInput("+1 (415) 555-2671")).toEqual({
      country: "US",
      callingCode: "1",
      nationalNumber: "4155552671",
    });
    expect(formatPhoneForInput("+1 415 555 2671")).toEqual({
      value: "(415) 555-2671",
      country: "US",
    });
  });

  it("número de Portugal colado com +", () => {
    expect(toE164("+351 912 345 678")).toBe("+351912345678");
    expect(formatPhoneForInput("+351 912 345 678").country).toBe("PT");
  });

  it("prefixo 00 é tratado como internacional", () => {
    expect(toE164("00351 912 345 678")).toBe("+351912345678");
  });

  it("número nacional dos EUA com o país selecionado", () => {
    expect(toE164("(415) 555-2671", "US")).toBe("+14155552671");
  });

  it("estrangeiro inválido é recusado", () => {
    expect(toE164("+1 123")).toBe(null);
    expect(toE164("+1 123 456 7890")).toBe(null);
  });
});

describe("formatPhoneForInput parcial", () => {
  it("mantém o que foi digitado enquanto incompleto", () => {
    expect(formatPhoneForInput("").value).toBe("");
    expect(formatPhoneForInput("11").value.replace(/\D/g, "")).toBe("11");
    expect(formatPhoneForInput("119876").value.replace(/\D/g, "")).toBe(
      "119876",
    );
  });
});

describe("limite de dígitos", () => {
  it("BR para no tamanho máximo do celular", () => {
    expect(formatPhoneForInput("(11) 98765-43219")).toEqual({
      value: "(11) 98765-4321",
      country: "BR",
    });
  });

  it("com DDI de outro país, corta pelo tamanho daquele país", () => {
    expect(formatPhoneForInput("+1 415 555 26719")).toEqual({
      value: "(415) 555-2671",
      country: "US",
    });
  });

  it("número colado com DDI sem + continua aceito", () => {
    expect(formatPhoneForInput("5511987654321")).toEqual({
      value: "(11) 98765-4321",
      country: "BR",
    });
  });

  it("número incompleto não é cortado", () => {
    expect(formatPhoneForInput("1198765")).toEqual({
      value: "(11) 98765",
      country: "BR",
    });
  });
});

describe("removeDigitNextToCaret", () => {
  it("backspace sobre o ) apaga o último dígito do DDD", () => {
    expect(removeDigitNextToCaret("(19", 3, "backward")).toEqual({
      raw: "1",
      digitsBeforeCaret: 1,
    });
  });

  it("backspace sobre o espaço apaga o dígito anterior", () => {
    expect(removeDigitNextToCaret("(19)9", 4, "backward")).toEqual({
      raw: "19",
      digitsBeforeCaret: 1,
    });
  });

  it("delete sobre o ) apaga o dígito seguinte", () => {
    expect(removeDigitNextToCaret("(19 99", 3, "forward")).toEqual({
      raw: "199",
      digitsBeforeCaret: 2,
    });
  });

  it("preserva o + do DDI", () => {
    expect(removeDigitNextToCaret("+14", 2, "backward")).toEqual({
      raw: "+4",
      digitsBeforeCaret: 0,
    });
  });

  it("sem dígito na direção da tecla, não remove nada", () => {
    expect(removeDigitNextToCaret("(", 0, "backward")).toEqual({
      raw: "",
      digitsBeforeCaret: 0,
    });
  });
});

describe("celular BR de 10 dígitos", () => {
  it("10 dígitos começando com 9 mantém a máscara", () => {
    expect(formatPhoneForInput("1998765432")).toEqual({
      value: "(19) 9876-5432",
      country: "BR",
    });
  });

  it("11 dígitos fica no formato com o nono dígito", () => {
    expect(formatPhoneForInput("(19) 9876-54321")).toEqual({
      value: "(19) 98765-4321",
      country: "BR",
    });
  });

  it("fixo de 10 dígitos continua igual", () => {
    expect(formatPhoneForInput("1933334444").value).toBe("(19) 3333-4444");
  });

  it("exibição usa a mesma máscara", () => {
    expect(formatPhoneForDisplay("+551998765432")).toBe("(19) 9876-5432");
  });
});
