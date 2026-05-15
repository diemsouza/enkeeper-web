import { QuestionFormatData } from "./types";

export const scenario: QuestionFormatData = {
  format: "scenario",
  question_info:
    "Usa uma sSituação realista que leva naturalmente ao termo. Termina com pergunta direta e única.",
  feedback_info:
    "Confirma com a resposta correta em frase de uso real. Sem explicação adicional.",
  levels: {
    basic: {
      question:
        "Você está mostrando sua casa pra um amigo e quer falar do espaço verde atrás da casa. O que você diz em inglês?",
      feedback: {
        right: 'Isso! "This is my garden."',
        wrong: 'Errado! "Garden". "This is my garden."',
        partial: 'Quase! "Garden". "This is my garden."',
      },
    },
    intermediate: {
      question:
        "Seu amigo está falando sobre um problema antigo que já foi resolvido. Você quer dizer pra ele esquecer isso. O que você diz?",
      feedback: {
        right: 'Isso! "Never mind, it\'s in the past."',
        wrong: 'Errado! "Never mind". "Never mind, it\'s in the past."',
        partial: 'Quase! "Never mind". "Never mind, it\'s in the past."',
      },
    },
    advanced: {
      question:
        "Your team is debating the ideal balance between speed and quality. What expression describes that perfect balance point?",
      feedback: {
        right: 'Exactly! "That\'s the sweet spot between speed and quality."',
        wrong:
          'Not quite! "Sweet spot". "That\'s the sweet spot between speed and quality."',
        partial:
          'Almost! "Sweet spot". "That\'s the sweet spot between speed and quality."',
      },
    },
  },
};
