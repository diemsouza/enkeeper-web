import { QuestionFormatData } from "./types";

export const scenario: QuestionFormatData = {
  format: "scenario",
  description: "Situação realista que leva naturalmente ao termo. Termina com pergunta direta, nunca com lacuna.",
  levels: {
    basic: {
      question_example: "Você está mostrando sua casa pra um amigo e quer falar do espaço verde atrás da casa. O que você diz em inglês?",
      feedback: {
        right: "Isso! \"This is my garden.\"",
        wrong: "Não foi dessa vez! \"Garden\" — \"This is my garden.\"",
        partial: "Quase! \"Garden\" — \"This is my garden.\"",
      },
    },
    intermediate: {
      question_example: "Seu amigo está falando sobre um problema antigo que já foi resolvido. Você quer dizer pra ele esquecer isso. O que você diz?",
      feedback: {
        right: "Isso! \"Never mind, it's in the past.\"",
        wrong: "Não foi dessa vez! \"Never mind\" — \"Never mind, it's in the past.\"",
        partial: "Quase! \"Never mind\" — \"Never mind, it's in the past.\"",
      },
    },
    advanced: {
      question_example: "Your team is debating the ideal balance between speed and quality. What expression describes that perfect balance point?",
      feedback: {
        right: "Correto! \"That's the sweet spot between speed and quality.\"",
        wrong: "Não foi dessa vez! \"Sweet spot\" — \"That's the sweet spot between speed and quality.\"",
        partial: "Quase! \"Sweet spot\" — \"That's the sweet spot between speed and quality.\"",
      },
    },
  },
};
