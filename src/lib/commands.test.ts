import { describe, expect, it } from "vitest";
import { CommandId, formatCommand, resolveCommand } from "./commands";

describe("resolveCommand", () => {
  it("resolve comando exato", () => {
    expect(resolveCommand("ajuda")).toBe("help");
  });

  it("resolve comando com barra", () => {
    expect(resolveCommand("/ajuda")).toBe("help");
  });

  it("resolve comando sem barra igual ao com barra", () => {
    expect(resolveCommand("praticar")).toBe(resolveCommand("/praticar"));
  });

  it("resolve com acento incorreto", () => {
    expect(resolveCommand("nao")).toBe("confirm_no");
  });

  it("resolve com acento correto", () => {
    expect(resolveCommand("não")).toBe("confirm_no");
  });

  it("resolve com case misto", () => {
    expect(resolveCommand("AJUDA")).toBe("help");
    expect(resolveCommand("Nova Atividade")).toBe("new_activity");
  });

  it("resolve alias alternativo", () => {
    expect(resolveCommand("trocar atividade")).toBe("new_activity");
    expect(resolveCommand("pause")).toBe("pause");
  });

  it("ignora espacos nas bordas", () => {
    expect(resolveCommand("  cancelar  ")).toBe("cancel");
  });

  it("retorna null quando nao corresponde a nada", () => {
    expect(resolveCommand("blablabla")).toBeNull();
  });
});

describe("formatCommand", () => {
  it("formata comando com prefixo", () => {
    expect(formatCommand("help")).toBe("/`ajuda`");
  });

  it("formata comando sem prefixo", () => {
    expect(formatCommand("confirm_yes")).toBe("`sim`");
  });

  it("aplica override strictMode: false", () => {
    expect(formatCommand("cancel", { strictMode: false })).toBe("`cancelar`");
  });

  it("lanca erro para id inexistente", () => {
    expect(() => formatCommand("nao_existe" as CommandId)).toThrow();
  });
});
