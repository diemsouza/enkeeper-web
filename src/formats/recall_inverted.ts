import { QuestionFormatData } from "./types";

export const recall_inverted: QuestionFormatData = {
  format: "recall_inverted",
  question_info:
    "Dado o termo, o usuário explica o significado ou uso em contexto.",
  feedback_info:
    "Confirma com o termo em contexto de uso real. Sem explicar significado, sem descrever o que a palavra significa.",
  levels: {
    basic: {
      question: 'O que significa "garden"?',
      feedback: {
        right: 'Isso! "My garden is beautiful."',
        wrong: 'Errado! "Garden" é jardim. "My garden is beautiful."',
        partial: 'Quase! "Garden" é jardim. "My garden is beautiful."',
      },
    },
    intermediate: {
      question: 'What does "never mind" mean?',
      feedback: {
        right: 'Isso! "Never mind, it\'s not a big deal."',
        wrong:
          'Errado! "Never mind" significa deixa pra lá. "Never mind, it\'s not a big deal."',
        partial:
          'Quase! "Never mind" significa deixa pra lá. "Never mind, it\'s not a big deal."',
      },
    },
    advanced: {
      question: 'How would you use "hold on" in a sentence?',
      feedback: {
        right: 'Correto! "Hold on, let me check that for you."',
        wrong: 'Errado! É "Hold on". "Hold on, let me check that for you."',
        partial: 'Quase! É "Hold on". "Hold on, let me check that for you."',
      },
    },
  },
};
