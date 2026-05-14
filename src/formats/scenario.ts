import { QuestionFormatData } from "./types";

export const scenario: QuestionFormatData = {
  format: "scenario",
  question_info:
    "Situação realista que leva naturalmente ao termo. Termina com pergunta direta, nunca com lacuna.",
  feedback_info:
    "Confirma com o termo em contexto de uso real. Sem explicar significado, sem descrever o que a palavra significa.",
  levels: {
    basic: {
      question:
        "Você está mostrando sua casa pra um amigo e quer falar do espaço verde atrás da casa. O que você diz em inglês?",
      feedback: {
        right: 'Isso! "This is my garden."',
        wrong: 'Errado! Seria "Garden" como "This is my garden."',
        partial: 'Quase! "Garden" seria o correto como em "This is my garden."',
      },
    },
    intermediate: {
      question:
        "Seu amigo está falando sobre um problema antigo que já foi resolvido. Você quer dizer pra ele esquecer isso. O que você diz?",
      feedback: {
        right: 'Isso! "Never mind, it\'s in the past."',
        wrong:
          'Errado! É "Never mind" como em "Never mind, it\'s in the past."',
        partial: 'Quase! É "Never mind" tipo "Never mind, it\'s in the past."',
      },
    },
    advanced: {
      question:
        "Your team is debating the ideal balance between speed and quality. What expression describes that perfect balance point?",
      feedback: {
        right: 'Correto! "That\'s the sweet spot between speed and quality."',
        wrong:
          'Errado! "Sweet spot" é o termo correto. Ex. "That\'s the sweet spot between speed and quality."',
        partial:
          'Quase! "Sweet spot" é o termo correto. Ex. "That\'s the sweet spot between speed and quality."',
      },
    },
  },
};
