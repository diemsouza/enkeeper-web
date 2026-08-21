import { describe, expect, it } from "vitest";
import {
  formatActivitySuggestion,
  formatNewActivityFlowCanceled,
} from "./formatters";

describe("formatNewActivityFlowCanceled", () => {
  it("sem atividade ativa, mensagem simples", () => {
    expect(formatNewActivityFlowCanceled().text).toBe("Ok, cancelado.");
  });

  it("com atividade ativa, avisa que ela continua normal", () => {
    expect(formatNewActivityFlowCanceled(true).text).toBe(
      "Ok, cancelado. Seguindo com a atividade atual.",
    );
  });

  it("false explícito equivale a default", () => {
    expect(formatNewActivityFlowCanceled(false).text).toBe(
      formatNewActivityFlowCanceled().text,
    );
  });
});

describe("formatActivitySuggestion", () => {
  it("menciona o comando por extenso no text e traz botão no interactive", () => {
    const message = formatActivitySuggestion();
    expect(message.text).toContain("🔄");
    expect(message.text).toContain("`/nova atividade`");
    expect(message.interactive?.buttons).toEqual([
      { id: "new_activity_suggestion", label: "Nova atividade" },
    ]);
  });
});
