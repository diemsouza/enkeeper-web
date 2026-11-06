import { describe, expect, it } from "vitest";
import {
  QUESTION_LEVEL_KINDS,
  QUESTION_PROBLEM_KINDS,
  shouldRegenerateQuestion,
} from "./question-rating";

describe("shouldRegenerateQuestion", () => {
  it("like nunca regenera", () => {
    expect(shouldRegenerateQuestion(true, null)).toBe(false);
  });

  it("motivos de dificuldade nao regeneram", () => {
    for (const kind of QUESTION_LEVEL_KINDS) {
      expect(shouldRegenerateQuestion(false, kind)).toBe(false);
    }
  });

  it("motivos de problema na pergunta regeneram", () => {
    for (const kind of QUESTION_PROBLEM_KINDS) {
      expect(shouldRegenerateQuestion(false, kind)).toBe(true);
    }
  });
});
