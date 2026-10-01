import { describe, expect, it } from "vitest";
import {
  buildAnsweredInteractive,
  resolveOptionIndex,
  resolveSelectedButtonId,
} from "./parser";

const buttons = [
  { id: "choice_option_1", label: "Mesa" },
  { id: "choice_option_2", label: "Cadeira" },
  { id: "choice_option_3", label: "Fogão" },
];

describe("resolveSelectedButtonId", () => {
  it("usa o buttonId quando ele existe entre os botões", () => {
    expect(resolveSelectedButtonId(buttons, "choice_option_2", "Mesa")).toBe(
      "choice_option_2",
    );
  });

  it("buttonId inexistente cai para o número digitado", () => {
    expect(resolveSelectedButtonId(buttons, "outro_1", "3")).toBe(
      "choice_option_3",
    );
  });

  it("resolve pelo número", () => {
    expect(resolveSelectedButtonId(buttons, undefined, " 1 ")).toBe(
      "choice_option_1",
    );
  });

  it("resolve pelo texto ignorando acento e caixa", () => {
    expect(resolveSelectedButtonId(buttons, undefined, "fogao")).toBe(
      "choice_option_3",
    );
  });

  it("sem correspondência devolve null", () => {
    expect(resolveSelectedButtonId(buttons, undefined, "sofá")).toBeNull();
    expect(resolveSelectedButtonId(buttons, undefined, "7")).toBeNull();
  });
});

describe("resolveOptionIndex", () => {
  const labels = buttons.map((b) => b.label);
  const interactive = { body: "Qual?", buttons, isOptionList: true };

  it("devolve a posição do botão", () => {
    expect(resolveOptionIndex(interactive, "choice_option_2", labels)).toBe(1);
  });

  it("botão inexistente devolve null", () => {
    expect(resolveOptionIndex(interactive, "outro_1", labels)).toBeNull();
  });

  it("lista já respondida devolve null", () => {
    expect(
      resolveOptionIndex(
        { ...interactive, disabled: true },
        "choice_option_1",
        labels,
      ),
    ).toBeNull();
  });

  it("rótulo diferente da opção atual devolve null", () => {
    expect(
      resolveOptionIndex(interactive, "choice_option_1", ["Sofá", "Cadeira"]),
    ).toBeNull();
  });

  it("sem isOptionList devolve null", () => {
    expect(
      resolveOptionIndex({ body: "Qual?", buttons }, "choice_option_1", labels),
    ).toBeNull();
  });
});

describe("buildAnsweredInteractive", () => {
  const interactive = { body: "Qual?", buttons, isOptionList: true };

  it("marca disabled e selectedId", () => {
    expect(buildAnsweredInteractive(interactive, "choice_option_1")).toEqual({
      ...interactive,
      disabled: true,
      selectedId: "choice_option_1",
    });
  });

  it("sem seleção grava só disabled", () => {
    expect(buildAnsweredInteractive(interactive, null)).toEqual({
      ...interactive,
      disabled: true,
    });
  });
});
