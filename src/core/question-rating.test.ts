import { describe, expect, it } from "vitest";
import {
  QUESTION_LEVEL_KINDS,
  QUESTION_PROBLEM_KINDS,
  readQuestionRating,
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

describe("readQuestionRating", () => {
  it("le o voto, com e sem snapshot", () => {
    expect(readQuestionRating({ questionRating: { rating: false } })).toEqual({
      rating: false,
    });
    expect(
      readQuestionRating({
        file_name: "a.pdf",
        questionRating: { rating: true, snapshotId: "s1" },
      }),
    ).toEqual({ rating: true, snapshotId: "s1" });
  });

  it("sem voto valido devolve null", () => {
    expect(readQuestionRating(null)).toBeNull();
    expect(readQuestionRating({ file_name: "a.pdf" })).toBeNull();
    expect(readQuestionRating({ questionRating: { rating: "yes" } })).toBeNull();
  });
});
