import { QuestionFormatData } from "./types";

export const recall: QuestionFormatData = {
  format: "recall",
  question_info:
    "Pergunta direta pedindo o termo a partir do significado ou uso.",
  feedback_info:
    "Confirma com o termo em contexto de uso real. Sem explicar significado, sem descrever o que a palavra significa.",
  levels: {
    basic: {
      question: 'Como se diz "jardim" em inglês?',
      feedback: {
        right: 'Isso! "My garden is beautiful."',
        wrong: 'Errado! O correto é "Garden" Ex. "My garden is beautiful."',
        partial: 'Quase! É "Garden" veja "My garden is beautiful."',
      },
    },
    intermediate: {
      question: 'What\'s the expression for "deixa pra lá"?',
      feedback: {
        right: 'Isso! "Never mind, it\'s not a big deal."',
        wrong:
          'Errado! O certo é "Never mind" como em "Never mind, it\'s not a big deal."',
        partial:
          'Quase! "Never mind" seria o correto. Veja: "Never mind, it\'s not a big deal."',
      },
    },
    advanced: {
      question: "What do you say when you want someone to wait a moment?",
      feedback: {
        right: 'Correto! "Hold on, let me check that for you."',
        wrong:
          'Errado! "Hold on" é o correto. "Hold on, let me check that for you."',
        partial: 'Quase! "Hold on" Ex. "Hold on, let me check that for you."',
      },
    },
  },
};
