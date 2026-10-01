import { describe, expect, it, vi } from "vitest";
import { QuestionFormat } from "../lib/prisma";
import { FormatCounts, pickNextFormat } from "./question-format-picker";

// lib/prisma instancia o PrismaClient no import; os testes so precisam dos enums
vi.mock("../lib/prisma", async () => import("../../prisma/generated/enums"));

const RUNS = 500;

function pickMany(
  lastFormat: QuestionFormat,
  canUseImage: boolean,
  formatCounts: FormatCounts = {},
): Set<QuestionFormat> {
  const picked = new Set<QuestionFormat>();
  for (let i = 0; i < RUNS; i++) {
    picked.add(pickNextFormat(lastFormat, { canUseImage, formatCounts }));
  }
  return picked;
}

describe("pickNextFormat", () => {
  it("primeira pergunta é sempre gap_fill", () => {
    expect(pickNextFormat(null, { canUseImage: true, formatCounts: {} })).toBe(
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

  it("sorteia só entre os formatos menos usados", () => {
    const picked = pickMany(QuestionFormat.gap_fill, true, {
      gap_fill: 2,
      recall: 2,
      image_recognition: 0,
      recall_inverted: 1,
      scenario: 0,
      choice: 2,
    });
    expect(picked).toEqual(
      new Set([QuestionFormat.image_recognition, QuestionFormat.scenario]),
    );
  });

  it("image_recognition atrasado tem prioridade", () => {
    const picked = pickMany(QuestionFormat.recall, true, {
      gap_fill: 3,
      recall: 3,
      recall_inverted: 3,
      scenario: 3,
      choice: 3,
    });
    expect(picked).toEqual(new Set([QuestionFormat.image_recognition]));
  });

  it("image_recognition atrasado continua bloqueado depois de choice", () => {
    const picked = pickMany(QuestionFormat.choice, true, {
      gap_fill: 3,
      recall: 3,
      recall_inverted: 3,
      scenario: 3,
      choice: 3,
    });
    expect(picked.has(QuestionFormat.image_recognition)).toBe(false);
  });

  it("sem rollout, ignora image_recognition mesmo com contagem zero", () => {
    const picked = pickMany(QuestionFormat.recall, false, {
      gap_fill: 3,
      recall: 3,
      recall_inverted: 3,
      scenario: 2,
      choice: 3,
    });
    expect(picked).toEqual(new Set([QuestionFormat.scenario]));
  });
});
