import { describe, expect, it, vi } from "vitest";
import { QuestionFormat } from "../lib/prisma";
import { isEvalTipClassAllowed } from "./eval-tip";

// lib/prisma instancia o PrismaClient no import; os testes so precisam dos enums
vi.mock("../lib/prisma", async () => import("../../prisma/generated/enums"));

describe("isEvalTipClassAllowed", () => {
  it("transcrição aceita só homophone e connected_speech", () => {
    const format = QuestionFormat.audio_transcription;
    expect(isEvalTipClassAllowed(format, "homophone")).toBe(true);
    expect(isEvalTipClassAllowed(format, "connected_speech")).toBe(true);
    expect(isEvalTipClassAllowed(format, "calque")).toBe(false);
    expect(isEvalTipClassAllowed(format, "alternative")).toBe(false);
  });

  it("formatos de texto não aceitam as classes de escuta", () => {
    expect(isEvalTipClassAllowed(QuestionFormat.recall, "homophone")).toBe(
      false,
    );
    expect(isEvalTipClassAllowed(QuestionFormat.recall, "calque")).toBe(true);
  });
});

describe("isEvalTipClassAllowed audio_translation", () => {
  it("aceita as classes de EN para PT, sem collocation nem escuta", () => {
    const format = QuestionFormat.audio_translation;
    for (const c of ["calque", "near_synonym", "literal_idiom", "register", "structure"]) {
      expect(isEvalTipClassAllowed(format, c)).toBe(true);
    }
    expect(isEvalTipClassAllowed(format, "collocation")).toBe(false);
    expect(isEvalTipClassAllowed(format, "homophone")).toBe(false);
    expect(isEvalTipClassAllowed(format, "alternative")).toBe(false);
  });
});
