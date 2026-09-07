import { describe, expect, it } from "vitest";
import { isProtectedPath, sanitizeRedirectPath } from "./auth-routes";

describe("isProtectedPath", () => {
  it("reconhece a raiz protegida e subrotas", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/app/")).toBe(true);
    expect(isProtectedPath("/app/c/123")).toBe(true);
  });

  it("nao casa prefixo parcial nem rota publica", () => {
    expect(isProtectedPath("/appfoo")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });
});

describe("sanitizeRedirectPath", () => {
  it("mantem caminhos internos sob rota protegida", () => {
    expect(sanitizeRedirectPath("/app")).toBe("/app");
    expect(sanitizeRedirectPath("/app/c/123?x=1")).toBe("/app/c/123?x=1");
  });

  it("cai no fallback para caminho fora de rota protegida", () => {
    expect(sanitizeRedirectPath("/settings")).toBe("/app");
    expect(sanitizeRedirectPath("/appfoo")).toBe("/app");
  });

  it("cai no fallback para URL absoluta ou esquema", () => {
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/app");
    expect(sanitizeRedirectPath("http:/x")).toBe("/app");
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/app");
  });

  it("cai no fallback para protocol-relative e backslash", () => {
    expect(sanitizeRedirectPath("//evil.com")).toBe("/app");
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/app");
    expect(sanitizeRedirectPath("/app\\..\\evil")).toBe("/app");
  });

  it("cai no fallback para barra dupla codificada", () => {
    expect(sanitizeRedirectPath("/%2f%2fevil.com")).toBe("/app");
    expect(sanitizeRedirectPath("%2f%2fevil.com")).toBe("/app");
  });

  it("cai no fallback para espaco, controle ou codificacao invalida", () => {
    expect(sanitizeRedirectPath("/app /x")).toBe("/app");
    expect(sanitizeRedirectPath("/app\t/x")).toBe("/app");
    expect(sanitizeRedirectPath("/app/%E0%A4%A")).toBe("/app");
  });

  it("cai no fallback para vazio, null e undefined", () => {
    expect(sanitizeRedirectPath("")).toBe("/app");
    expect(sanitizeRedirectPath(null)).toBe("/app");
    expect(sanitizeRedirectPath(undefined)).toBe("/app");
  });

  it("respeita fallback customizado", () => {
    expect(sanitizeRedirectPath("https://evil.com", "/app/c")).toBe("/app/c");
  });
});
