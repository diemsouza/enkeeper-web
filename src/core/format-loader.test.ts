import { describe, expect, it, vi } from "vitest";
import { QuestionFormat } from "../lib/prisma";
import { SectionQuestionResult } from "../lib/llm-schemas";
import { validateGeneratedQuestion } from "./format-loader";

function buildQuestion(
  overrides: Partial<SectionQuestionResult>,
): SectionQuestionResult {
  return {
    question: "",
    answerKeys: ["waiting"],
    questionFormat: QuestionFormat.recall,
    questionOptions: [],
    term: "I am waiting for an answer",
    termHint: null,
    meaning: "eu estou esperando uma resposta",
    sourceContent: null,
    warning: null,
    imageable: null,
    imageableReason: null,
    questionImageDescription: null,
    questionAudioText: null,
    ...overrides,
  };
}

describe("validateGeneratedQuestion enunciado vazio", () => {
  it("rejeita enunciado vazio em formato de texto", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = validateGeneratedQuestion(buildQuestion({}));
    expect(result).toContain("sem enunciado");
  });

  it("aceita enunciado vazio nos formatos de imagem e áudio", () => {
    const formats = [
      QuestionFormat.image_recognition,
      QuestionFormat.image_transcription,
      QuestionFormat.audio_transcription,
      QuestionFormat.audio_translation,
    ];
    for (const questionFormat of formats) {
      const result = validateGeneratedQuestion(
        buildQuestion({ questionFormat }),
      );
      expect(result).toBeUndefined();
    }
  });
});
