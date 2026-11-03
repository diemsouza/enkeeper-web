import { describe, expect, it } from "vitest";
import {
  buildAppEntryUrl,
  parseDomainParam,
  stripDomainParam,
} from "./domain-param";

describe("parseDomainParam", () => {
  it("aceita os ids de DOMAINS", () => {
    expect(parseDomainParam("daily_life")).toBe("daily_life");
    expect(parseDomainParam("travel")).toBe("travel");
    expect(parseDomainParam("education")).toBe("education");
    expect(parseDomainParam("work")).toBe("work");
  });

  it("ignora valor ausente, desconhecido ou com caixa diferente", () => {
    expect(parseDomainParam(null)).toBeNull();
    expect(parseDomainParam(undefined)).toBeNull();
    expect(parseDomainParam("")).toBeNull();
    expect(parseDomainParam("xpto")).toBeNull();
    expect(parseDomainParam("Travel")).toBeNull();
  });
});

describe("buildAppEntryUrl", () => {
  it("monta /app com e sem domain", () => {
    expect(buildAppEntryUrl(null)).toBe("/app");
    expect(buildAppEntryUrl("work")).toBe("/app?domain=work");
  });
});

describe("stripDomainParam", () => {
  it("remove so o domain", () => {
    expect(stripDomainParam("?domain=work")).toBe("");
    expect(stripDomainParam("?domain=work&utm_source=x")).toBe("?utm_source=x");
    expect(stripDomainParam("")).toBe("");
  });
});
