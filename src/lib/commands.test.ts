import { describe, expect, it } from "vitest";
import { CommandId, formatCommand, resolveCommand } from "./commands";

describe("resolveCommand", () => {
  it("resolve comando com barra", () => {
    expect(resolveCommand("/ajuda")).toBe("help");
    expect(resolveCommand("/continuar")).toBe("continue");
  });

  it("sem barra nunca e comando", () => {
    expect(resolveCommand("ajuda")).toBeNull();
    expect(resolveCommand("praticar")).toBeNull();
    expect(resolveCommand("sim")).toBeNull();
    expect(resolveCommand("continuar")).toBeNull();
  });

  it("resolve com e sem acento", () => {
    expect(resolveCommand("/nao")).toBe("confirm_no");
    expect(resolveCommand("/não")).toBe("confirm_no");
  });

  it("resolve com case misto", () => {
    expect(resolveCommand("/AJUDA")).toBe("help");
    expect(resolveCommand("/Nova Atividade")).toBe("new_activity");
  });

  it("resolve alias alternativo", () => {
    expect(resolveCommand("/trocar atividade")).toBe("new_activity");
    expect(resolveCommand("/parar")).toBe("pause");
  });

  it("ignora espacos nas bordas", () => {
    expect(resolveCommand("  /cancelar  ")).toBe("cancel");
  });

  it("retorna null quando nao corresponde a nada", () => {
    expect(resolveCommand("/blablabla")).toBeNull();
  });
});

describe("formatCommand", () => {
  it("formata comando com barra", () => {
    expect(formatCommand("help")).toBe("`/ajuda`");
    expect(formatCommand("continue")).toBe("`/continuar`");
  });

  it("lanca erro para id inexistente", () => {
    expect(() => formatCommand("nao_existe" as CommandId)).toThrow();
  });
});
