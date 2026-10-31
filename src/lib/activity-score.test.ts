import { describe, expect, it, vi } from "vitest";
import { applyImageMismatch, updateScoreMetadata } from "./activity-score";

// lib/prisma instancia o PrismaClient no import; os testes so precisam dos enums
vi.mock("./prisma", async () => import("../../prisma/generated/enums"));

const baseQuestion = {
  attemptCount: 0,
  wrongCount: 0,
  revisionCount: 0,
  metadata: null,
};

describe("applyImageMismatch", () => {
  it("liga a flag com a razão", () => {
    const metadata = applyImageMismatch({}, true, "A imagem mostra um teatro.");
    expect(metadata).toEqual({
      imageMismatch: true,
      imageMismatchReason: "A imagem mostra um teatro.",
    });
  });

  it("sem mismatch, não mexe no metadata", () => {
    expect(applyImageMismatch({ rightCount: 1 }, false, null)).toEqual({
      rightCount: 1,
    });
  });

  it("flag nunca volta a false numa nova avaliação", () => {
    const first = applyImageMismatch(
      updateScoreMetadata(baseQuestion, "wrong", "text", false),
      true,
      "A imagem mostra um teatro.",
    );
    const second = applyImageMismatch(
      updateScoreMetadata(
        { ...baseQuestion, attemptCount: 1, metadata: first },
        "right",
        "text",
        true,
      ),
      false,
      null,
    );
    expect(second.imageMismatch).toBe(true);
    expect(second.imageMismatchReason).toBe("A imagem mostra um teatro.");
    expect(second.rightCount).toBe(1);
  });
});
