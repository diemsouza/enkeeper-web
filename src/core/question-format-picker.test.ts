import { describe, expect, it, vi } from "vitest";
import { QuestionFormat } from "../lib/prisma";
import { pickNextFormat } from "./question-format-picker";

// lib/prisma instancia o PrismaClient no import; os testes so precisam dos enums
vi.mock("../lib/prisma", async () => import("../../prisma/generated/enums"));

const RUNS = 500;

function pickMany(
  lastFormat: QuestionFormat,
  canUseImage: boolean,
): Set<QuestionFormat> {
  const picked = new Set<QuestionFormat>();
  for (let i = 0; i < RUNS; i++) {
    picked.add(pickNextFormat(lastFormat, { canUseImage }));
  }
  return picked;
}

describe("pickNextFormat", () => {
  it("primeira pergunta é sempre gap_fill", () => {
    expect(pickNextFormat(null, { canUseImage: true })).toBe(
      QuestionFormat.gap_fill,
    );
  });

  it("nunca sorteia choice depois de image_recognition", () => {
    const picked = pickMany(QuestionFormat.image_recognition, true);
    expect(picked.has(QuestionFormat.choice)).toBe(false);
    expect(picked.has(QuestionFormat.image_recognition)).toBe(false);
  });

  it("nunca sorteia image_recognition depois de choice", () => {
    const picked = pickMany(QuestionFormat.choice, true);
    expect(picked.has(QuestionFormat.image_recognition)).toBe(false);
    expect(picked.has(QuestionFormat.choice)).toBe(false);
  });

  it("sem rollout, nunca sorteia image_recognition", () => {
    const picked = pickMany(QuestionFormat.gap_fill, false);
    expect(picked.has(QuestionFormat.image_recognition)).toBe(false);
    expect(picked.has(QuestionFormat.choice)).toBe(true);
  });

  it("com rollout, image_recognition entra no sorteio", () => {
    const picked = pickMany(QuestionFormat.gap_fill, true);
    expect(picked.has(QuestionFormat.image_recognition)).toBe(true);
  });
});
