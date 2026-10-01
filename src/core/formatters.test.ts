import { describe, expect, it, vi } from "vitest";
import { Level, QuestionFormat } from "../lib/prisma";
import {
  formatActivitySuggestion,
  formatCaptureStepOptionsText,
  formatDomainQuestion,
  formatFocusQuestion,
  formatLevelQuestion,
  formatNewActivityFlowCanceled,
  formatPracticeWaiting,
  formatQuestion,
  formatTopicQuestion,
} from "./formatters";

// lib/prisma instancia o PrismaClient no import; os testes so precisam dos enums
vi.mock("../lib/prisma", async () => import("../../prisma/generated/enums"));

describe("passos de captura", () => {
  it("nível: opções no interactive, text com enunciado e aviso de cancelar", () => {
    const message = formatLevelQuestion();
    expect(message.text).not.toContain("Básico");
    expect(message.text).toContain("*Nível de Inglês*");
    expect(message.text).toMatch(/para sair\._$/);
    expect(message.interactive?.body).toBe(message.text);
    expect(message.interactive?.isOptionList).toBe(true);
    expect(message.interactive?.isCaptureStep).toBe(true);
    expect(message.interactive?.buttons.map((b) => b.label)).toEqual([
      "Básico",
      "Intermediário",
      "Avançado",
    ]);
  });

  it("objetivo: lista completa e sem instrução de número", () => {
    const message = formatDomainQuestion();
    expect(message.text).not.toContain("número");
    expect(message.interactive?.buttons).toHaveLength(4);
  });

  it("assunto e ponto: um botão por sugestão, sem atalhos", () => {
    const topic = formatTopicQuestion(["Viagem", "Comida"]);
    expect(topic.interactive?.buttons.map((b) => b.label)).toEqual([
      "Viagem",
      "Comida",
    ]);
    const focus = formatFocusQuestion([
      { key: "general_vocabulary", label: "Vocabulário geral" },
    ]);
    expect(focus.interactive?.buttons.map((b) => b.label)).toEqual([
      "Vocabulário geral",
    ]);
    expect(focus.text).toContain("até 2");
  });

  it("formatCaptureStepOptionsText: corpo, opções e instrução", () => {
    expect(formatCaptureStepOptionsText("Corpo", ["A", "B"])).toBe(
      "Corpo\n\n1️⃣ A\n2️⃣ B\n\n_Responda com o número de uma opção._",
    );
  });
});

describe("formatNewActivityFlowCanceled", () => {
  it("sem atividade ativa, mensagem simples", () => {
    expect(formatNewActivityFlowCanceled().text).toBe("Ok, cancelado.");
  });

  it("com atividade ativa, avisa que ela continua normal", () => {
    expect(formatNewActivityFlowCanceled(true).text).toBe(
      "Ok, cancelado. Seguindo com a atividade atual.",
    );
  });

  it("false explícito equivale a default", () => {
    expect(formatNewActivityFlowCanceled(false).text).toBe(
      formatNewActivityFlowCanceled().text,
    );
  });
});

describe("formatActivitySuggestion", () => {
  it("menciona o comando por extenso no text e traz botão no interactive", () => {
    const message = formatActivitySuggestion();
    expect(message.text).toContain("🔄");
    expect(message.text).toContain("`/nova atividade`");
    expect(message.interactive?.buttons).toEqual([
      { id: "new_activity_suggestion", label: "Nova atividade" },
    ]);
  });
});

describe("formatQuestion image_recognition", () => {
  const question = {
    question: "",
    questionFormat: QuestionFormat.image_recognition,
    questionOptions: ["run", "sleep", "cook", "read"],
    questionImageMediaId: "01JIMAGE",
  };
  const ptPrompts = [
    "Selecione a opção em inglês que mais descreve a imagem.",
    "Observe a imagem e escolha abaixo a palavra em inglês que combina com ela.",
    "Escolha, entre as opções abaixo, a que melhor representa o que aparece na imagem.",
    "Olhe a imagem com atenção e selecione a opção em inglês que corresponde a ela.",
  ];
  const enPrompts = [
    "Select the option below that best describes the image.",
    "Look at the image and choose the word that matches it best.",
    "Choose the option that best represents what you see in the image.",
    "Take a look at the image and pick the option that fits it.",
  ];

  it("básico usa enunciado em PT, sem lista de opções no text", () => {
    const { text } = formatQuestion(question, { level: Level.basic });
    expect(ptPrompts).toContain(text);
  });

  it("intermediário e avançado usam enunciado em EN", () => {
    for (const level of [Level.intermediate, Level.advanced]) {
      const { text } = formatQuestion(question, { level });
      expect(enPrompts).toContain(text);
    }
  });

  it("leva imageMediaId e um botão por opção, body só com o enunciado", () => {
    const message = formatQuestion(question, { level: Level.basic });
    expect(message.imageMediaId).toBe("01JIMAGE");
    expect(message.interactive?.body).toBe(message.text);
    expect(message.interactive?.isOptionList).toBe(true);
    expect(message.interactive?.buttons.map((b) => b.label)).toEqual(
      question.questionOptions,
    );
  });

  it("sem imagem, mantém enunciado e botões sem imageMediaId", () => {
    const message = formatQuestion(
      { ...question, questionImageMediaId: null },
      { level: Level.basic },
    );
    expect(message.imageMediaId).toBeUndefined();
    expect(message.interactive?.isOptionList).toBe(true);
  });
});

describe("formatQuestion choice", () => {
  const question = {
    question: "Which word means happy?",
    questionFormat: QuestionFormat.choice,
    questionOptions: ["glad", "tired", "angry"],
  };

  it("text só com a pergunta e interactive com um botão por opção", () => {
    const message = formatQuestion(question, { level: Level.intermediate });
    expect(message.text).toBe("Which word means happy?");
    expect(message.interactive).toEqual({
      body: "Which word means happy?",
      buttons: [
        { id: "choice_option_1", label: "glad" },
        { id: "choice_option_2", label: "tired" },
        { id: "choice_option_3", label: "angry" },
      ],
      isOptionList: true,
    });
  });

  it("sem opções, cai para texto puro", () => {
    const message = formatQuestion(
      { ...question, questionOptions: [] },
      { level: Level.intermediate },
    );
    expect(message.interactive).toBeUndefined();
  });
});

describe("formatPracticeWaiting", () => {
  it("oferece o botão Praticar para receber a próxima pergunta agora", () => {
    const message = formatPracticeWaiting();
    expect(message.interactive?.buttons).toEqual([
      { id: "practice_now", label: "Praticar", type: "reply" },
    ]);
  });
});
