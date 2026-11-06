import { describe, expect, it } from "vitest";
import { readActivityReadyDomain } from "./activity-ready";

describe("readActivityReadyDomain", () => {
  it("devolve o objetivo gravado na mensagem", () => {
    expect(readActivityReadyDomain({ activityReadyDomain: "travel" })).toBe("travel");
  });

  it("ignora valor desconhecido", () => {
    expect(readActivityReadyDomain({ activityReadyDomain: "sports" })).toBeNull();
  });

  it("ignora metadata sem a chave ou nula", () => {
    expect(readActivityReadyDomain({ command: {} })).toBeNull();
    expect(readActivityReadyDomain(null)).toBeNull();
  });
});
