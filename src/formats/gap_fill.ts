import { QuestionFormatData } from "./types";

const intermediateAdvanced = {
  question_example: "Complete: \"I found the ______ between price and quality.\" (ponto ideal)",
  feedback: {
    right: "Exato! \"I found the sweet spot between price and quality.\"",
    wrong: "Não foi dessa vez! \"Sweet spot\" completa — \"I found the sweet spot between price and quality.\"",
    partial: "Quase! Faltou o artigo — \"I found the sweet spot between price and quality.\"",
  },
};

export const gap_fill: QuestionFormatData = {
  format: "gap_fill",
  description: "Frase completa e natural com ______ no lugar do termo fixado. A lacuna cobre sempre o termo do material — nunca palavra do contexto ao redor.",
  levels: {
    basic: {
      question_example: "Complete: \"O ______ fica atrás da casa.\" (garden)",
      feedback: {
        right: "Exato! \"O garden fica atrás da casa.\"",
        wrong: "Não foi dessa vez! \"Garden\" completa — \"O garden fica atrás da casa.\"",
        partial: "Quase! Faltou o \"n\" no final — \"garden\".",
      },
    },
    intermediate: intermediateAdvanced,
    advanced: intermediateAdvanced,
  },
};
