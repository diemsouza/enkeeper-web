import { describe, expect, it } from "vitest";
import {
  isPracticePillActive,
  isTurnInProgress,
  resolvePracticeActions,
  type PracticePillState,
} from "./practice-pill";

const NOW = new Date("2026-11-05T12:00:00Z").getTime();
const question = { id: "q1", rating: null };

function buildState(overrides: Partial<PracticePillState>): PracticePillState {
  return {
    isVisible: true,
    intensiveUntil: new Date(NOW + 60_000).toISOString(),
    isLimitReached: false,
    practiceActions: null,
    ...overrides,
  };
}

describe("isTurnInProgress", () => {
  it("em andamento ate a resposta do turno", () => {
    const lastRequestAt = new Date(NOW - 20_000);
    expect(isTurnInProgress({ lastRequestAt, lastResponseAt: null }, NOW)).toBe(
      true,
    );
    expect(
      isTurnInProgress({ lastRequestAt, lastResponseAt: new Date(NOW) }, NOW),
    ).toBe(false);
  });

  it("expira no teto, mesmo sem resposta", () => {
    expect(
      isTurnInProgress(
        { lastRequestAt: new Date(NOW - 61_000), lastResponseAt: null },
        NOW,
      ),
    ).toBe(false);
  });
});

describe("resolvePracticeActions", () => {
  it("mostra o Continuar com proxima pergunta e dentro do limite", () => {
    expect(
      resolvePracticeActions({
        question,
        messageId: "m1",
        isLimitReached: false,
        hasNextQuestion: true,
      }).canContinue,
    ).toBe(true);
  });

  it("fim do fluxo mantem os icones, sem Continuar", () => {
    const limit = resolvePracticeActions({
      question,
      messageId: "m1",
      isLimitReached: true,
      hasNextQuestion: true,
    });
    expect(limit).toEqual({
      questionId: "q1",
      messageId: "m1",
      rating: null,
      canContinue: false,
    });
    expect(
      resolvePracticeActions({
        question,
        messageId: "m1",
        isLimitReached: false,
        hasNextQuestion: false,
      }).canContinue,
    ).toBe(false);
  });
});

describe("isPracticePillActive", () => {
  it("dentro da janela fica inativa, mesmo aguardando Continuar", () => {
    expect(isPracticePillActive(buildState({}), NOW)).toBe(false);
    expect(
      isPracticePillActive(
        buildState({
          practiceActions: {
            questionId: "q1",
            messageId: "m1",
            rating: null,
            canContinue: true,
          },
        }),
        NOW,
      ),
    ).toBe(false);
  });

  it("janela expirada fica ativa aguardando Continuar", () => {
    expect(
      isPracticePillActive(
        buildState({
          intensiveUntil: new Date(NOW - 60_000).toISOString(),
          practiceActions: {
            questionId: "q1",
            messageId: "m1",
            rating: null,
            canContinue: true,
          },
        }),
        NOW,
      ),
    ).toBe(true);
  });

  it("limite vence tudo", () => {
    expect(
      isPracticePillActive(
        buildState({
          isLimitReached: true,
          practiceActions: {
            questionId: "q1",
            messageId: "m1",
            rating: null,
            canContinue: true,
          },
        }),
        NOW,
      ),
    ).toBe(false);
  });
});
