import { QuestionFormatData } from "./types";

export const choice: QuestionFormatData = {
  format: "choice",
  question_info:
    "Apresenta de 2 à 5 opções. As opções vão em questionOptions, a correta em answerKeys. A posição da resposta correta em questionOptions deve ser aleatória.",
  feedback_info:
    "Nunca explique por que a opção errada está errada, apenas confirme ou corrija com o termo certo em contexto. Aceitar letra (a, b, c, d, e) ou texto da opção como resposta válida.",
  levels: {
    basic: {
      question: 'Qual palavra significa "jardim" em inglês?',
      feedback: {
        right: 'Isso! "My garden is beautiful."',
        wrong: 'Errado! É "garden". Ex. "My garden is beautiful."',
      },
    },
    intermediate: {
      question: 'Qual expressão usaria pra dizer "deixa pra lá"?',
      feedback: {
        right: 'Isso! "Never mind, it\'s not a big deal."',
        wrong:
          'Errado! "Never mind" é o certo como em "Never mind, it\'s not a big deal."',
      },
    },
    advanced: {
      question: "Which expression means the perfect balance point?",
      feedback: {
        right: 'Correto! "That\'s the sweet spot between speed and quality."',
        wrong:
          'Errado! "Sweet spot" é o termo correto. Ex. "That\'s the sweet spot between speed and quality."',
      },
    },
  },
};
