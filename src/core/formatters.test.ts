import { describe, expect, it } from "vitest";
import {
  formatActivitySuggestion,
  formatNewActivityFlowCanceled,
} from "./formatters";

describe("formatNewActivityFlowCanceled", () => {
  it("sem atividade ativa, mensagem simples", () => {
    expect(formatNewActivityFlowCanceled()).toBe("Ok, cancelado.");
  });

  it("com atividade ativa, avisa que ela continua normal", () => {
    expect(formatNewActivityFlowCanceled(true)).toBe(
      "Ok, cancelado. Seguindo com a atividade atual.",
    );
  });

  it("false explícito equivale a default", () => {
    expect(formatNewActivityFlowCanceled(false)).toBe(
      formatNewActivityFlowCanceled(),
    );
  });
});

describe("formatActivitySuggestion", () => {
  it("menciona o comando por extenso, funciona com ou sem botão", () => {
    const text = formatActivitySuggestion();
    expect(text).toContain("🔄");
    expect(text).toContain("`/nova atividade`");
  });
});
