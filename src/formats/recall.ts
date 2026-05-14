import { QuestionFormatData } from "./types";

export const recall: QuestionFormatData = {
  format: "recall",
  question_info:
    "Pergunta direta pedindo o termo a partir do significado ou uso.",
  feedback_info:
    "Confirma com o termo em contexto de uso real. Sem explicação adicional.",
  levels: {
    basic: {
      question: 'Como se diz "jardim" em inglês?',
      feedback: {
        right: 'Isso! "My garden is beautiful."',
        wrong: 'Errado! "Garden". "My garden is beautiful."',
        partial: 'Quase! "Garden". "My garden is beautiful."',
      },
    },
    intermediate: {
      question: 'What\'s the expression for "deixa pra lá"?',
      feedback: {
        right: 'Isso! "Never mind, it\'s not a big deal."',
        wrong: 'Errado! "Never mind". "Never mind, it\'s not a big deal."',
        partial:
          'Quase! "Never mind". Veja: "Never mind, it\'s not a big deal."',
      },
    },
    advanced: {
      question: "What do you say when you want someone to wait a moment?",
      feedback: {
        right: 'Exactly! "Hold on, let me check that for you."',
        wrong: 'Not quite! "Hold on". "Hold on, let me check that for you."',
        partial: 'Almost! "Hold on". "Hold on, let me check that for you."',
      },
    },
  },
};
