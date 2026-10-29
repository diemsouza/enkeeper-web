import { describe, expect, it } from "vitest";
import {
  isUnchangedSuggestion,
  mergeFocusKeys,
  resolveActivityRequest,
} from "./activity-request";
import { TOPIC_SUGGESTIONS } from "../lib/constants";

const controls = {
  text: "reunião com meu chefe sobre um atraso",
  level: "basic" as const,
  focusKeys: [] as string[],
  domainKey: "daily_life" as const,
};

describe("mergeFocusKeys", () => {
  it("prioriza os marcados e completa com os do texto até 3", () => {
    expect(
      mergeFocusKeys(["modals", "future"], ["past_simple", "negation"]),
    ).toEqual(["modals", "future", "past_simple"]);
  });

  it("sem foco nenhum usa vocabulário geral", () => {
    expect(mergeFocusKeys([], [])).toEqual(["vocabulary"]);
  });

  it("descarta chave inválida e repetida", () => {
    expect(mergeFocusKeys(["modals"], ["modals", "inventado"])).toEqual([
      "modals",
    ]);
  });
});

describe("resolveActivityRequest", () => {
  it("sem extração usa os controles e o texto como tema", () => {
    expect(resolveActivityRequest(controls, null)).toEqual({
      domainKey: "daily_life",
      topic: controls.text,
      level: "basic",
      focusKeys: ["vocabulary"],
    });
  });

  it("nível escrito no texto vence o selecionado", () => {
    const resolved = resolveActivityRequest(controls, {
      domainKey: "work",
      topic: "Reunião sobre atraso no projeto",
      levelFromText: "advanced",
      focusKeysFromText: ["past_simple"],
    });
    expect(resolved).toEqual({
      domainKey: "work",
      topic: "Reunião sobre atraso no projeto",
      level: "advanced",
      focusKeys: ["past_simple"],
    });
  });

  it("objetivo fora da lista cai na aba ativa", () => {
    const resolved = resolveActivityRequest(controls, {
      domainKey: "outro",
      topic: null,
      levelFromText: null,
      focusKeysFromText: [],
    });
    expect(resolved.domainKey).toBe("daily_life");
    expect(resolved.topic).toBe(controls.text);
  });
});

describe("isUnchangedSuggestion", () => {
  it("reconhece a sugestão do próprio objetivo", () => {
    expect(isUnchangedSuggestion(TOPIC_SUGGESTIONS.work[0], "work")).toBe(true);
  });

  it("texto editado não é sugestão", () => {
    expect(
      isUnchangedSuggestion(`${TOPIC_SUGGESTIONS.work[0]} amanhã`, "work"),
    ).toBe(false);
  });
});
