import { describe, expect, it, vi } from "vitest";
import { Level, QuestionFormat } from "../lib/prisma";
import {
  formatActivitySuggestion,
  formatCreateActivityPrompt,
  formatDocProcessed,
  formatFeedback,
  formatPracticeWaiting,
  formatQuestion,
  formatReviewUpToDate,
} from "./formatters";
import { resolveCommand } from "../lib/commands";

// lib/prisma instancia o PrismaClient no import; os testes so precisam dos enums
vi.mock("../lib/prisma", async () => import("../../prisma/generated/enums"));

describe("formatCreateActivityPrompt", () => {
  it("botão com rótulo que é alias do comando de nova atividade", () => {
    const message = formatCreateActivityPrompt(true);
    expect(message.text).toContain("primeira atividade");
    const [button] = message.interactive?.buttons ?? [];
    expect(resolveCommand(button.label)).toBe("new_activity");
  });
});

describe("formatDocProcessed", () => {
  it("mostra objetivo, assunto, nível e foco aplicados", () => {
    const message = formatDocProcessed(false, 3, Level.advanced, {
      domainKey: "work",
      domain: "Mercado de Trabalho",
      topic: "Pedir mais prazo",
      subtopics: [],
      subtopic: "",
      focusKeys: ["modals", "future"],
      focus: ["Verbos modais", "Futuro"],
    });
    expect(message.text).toContain("*Nível:* Avançado");
    expect(message.text).toContain("*Foco:* Verbos modais, Futuro");
  });

  it("material sem metadata mostra só o nível", () => {
    const message = formatDocProcessed(false, 3, Level.basic);
    expect(message.text).toBe(
      "Pronto. A primeira pergunta chega em instantes.\n\n*Nível:* Básico",
    );
  });
});

describe("formatActivitySuggestion", () => {
  it("fora do intensivo sugere continuar praticando e traz botão Praticar", () => {
    const message = formatActivitySuggestion({ isIntensiveMode: false });
    expect(message.text).toContain("🔄");
    expect(message.text).toContain("`/nova atividade`");
    expect(message.text).toContain("ou continue praticando.");
    expect(message.text).not.toContain("aguarde");
    expect(message.interactive?.buttons).toEqual([
      { id: "new_activity_suggestion", label: "Nova atividade" },
      { id: "practice_now", label: "Praticar", type: "reply" },
    ]);
  });

  it("no intensivo sugere aguardar a próxima pergunta, sem botão Praticar", () => {
    const message = formatActivitySuggestion({ isIntensiveMode: true });
    expect(message.text).toContain("ou apenas aguarde a próxima pergunta.");
    expect(message.interactive?.body).toContain(
      "ou apenas aguarde a próxima pergunta.",
    );
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

describe("formatReviewUpToDate", () => {
  it("devolve o texto fixo de revisão em dia", () => {
    expect(formatReviewUpToDate().text).toBe(
      "✅ Revisão em dia. Continue praticando.",
    );
  });
});

describe("formatQuestion audio_transcription", () => {
  const sentence = "I need a warm blanket tonight.";
  const question = {
    question: sentence,
    questionFormat: QuestionFormat.audio_transcription,
    questionOptions: [],
    questionAudioMediaId: "media_1",
  };

  it("text leva só a instrução, nunca a frase do áudio", () => {
    const message = formatQuestion(question, { level: Level.basic });
    expect(message.text).not.toContain(sentence);
    expect(message.text.length).toBeGreaterThan(0);
    expect(message.audioMediaId).toBe("media_1");
    expect(message.interactive).toBeUndefined();
  });

  it("instrução em inglês fora do básico", () => {
    const message = formatQuestion(question, { level: Level.advanced });
    expect(message.text).toMatch(/hear/);
  });
});

describe("formatFeedback audio_transcription", () => {
  it("frase EN limpa entre aspas e tradução em itálico entre parênteses", () => {
    const message = formatFeedback(
      {
        status: "partial",
        feedback_text: '"I get up ~erly~ *early* every day."',
        feedback_translation: "Eu levanto cedo todo dia.",
        right_answer: "I get up early every day.",
        user_unknown: false,
        eval_tip_class: "spelling",
        eval_tip: null,
      },
      Level.basic,
      { format: QuestionFormat.audio_transcription },
    );
    expect(message.text).toMatch(
      / "I get up early every day\." \(_Eu levanto cedo todo dia\._\)$/,
    );
    expect(message.text).not.toContain("\n");
  });
});

describe("audio_translation", () => {
  const sentence = "I get up early every day.";

  it("text leva só a instrução, nunca a frase do áudio", () => {
    const message = formatQuestion(
      {
        question: sentence,
        questionFormat: QuestionFormat.audio_translation,
        questionOptions: [],
        questionAudioMediaId: "media_2",
      },
      { level: Level.basic },
    );
    expect(message.text).not.toContain(sentence);
    expect(message.text).toMatch(/português/);
    expect(message.audioMediaId).toBe("media_2");
  });

  it("tradução PT entre aspas e frase EN em itálico entre parênteses", () => {
    const message = formatFeedback(
      {
        status: "right",
        feedback_text: sentence,
        feedback_translation: "Eu levanto cedo todo dia.",
        right_answer: "Eu levanto cedo todo dia.",
        user_unknown: false,
        eval_tip_class: "none",
        eval_tip: null,
      },
      Level.basic,
      { format: QuestionFormat.audio_translation },
    );
    expect(message.text).toMatch(
      / "Eu levanto cedo todo dia\." \(_I get up early every day\._\)$/,
    );
  });
});
