import { QuestionFormatData } from "./types";

export const choice: QuestionFormatData = {
  format: "choice",
  question_info:
    "Apresenta de 2 à 5 opções. As opções vão em questionOptions, a correta em answerKeys.",
  feedback_info:
    "Nunca explique o resultado, só siga o padrão do exemplo relacionado. Aceitar letra (a, b, c, d, e) ou texto da opção como resposta válida.",
  levels: {
    basic: {
      question: 'Qual palavra significa "jardim" em inglês?',
      feedback: {
        right: 'Isso! "My garden is beautiful."',
        wrong: 'Errado! "Garden". "My garden is beautiful."',
      },
    },
    intermediate: {
      question: 'Qual expressão usaria pra dizer "deixa pra lá"?',
      feedback: {
        right: 'Isso! "Never mind, it\'s not a big deal."',
        wrong: 'Errado! "Never mind". "Never mind, it\'s not a big deal."',
      },
    },
    advanced: {
      question: "Which expression means the perfect balance point?",
      feedback: {
        right: 'Exactly! "That\'s the sweet spot between speed and quality."',
        wrong:
          'Not quite! "Sweet spot". Ex. "That\'s the sweet spot between speed and quality."',
      },
    },
  },
};
