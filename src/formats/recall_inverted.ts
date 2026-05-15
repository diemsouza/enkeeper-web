import { QuestionFormatData } from "./types";

export const recall_inverted: QuestionFormatData = {
  format: "recall_inverted",
  question_info:
    "Dado o termo, o usuário explica o significado ou uso em contexto.",
  feedback_info:
    "Confirma com a resposta correta em frase de uso real. Sem explicação adicional.",
  levels: {
    basic: {
      question: 'O que significa "garden"?',
      feedback: {
        right: 'Isso! "My garden is beautiful."',
        wrong: 'Errado! "Garden". "My garden is beautiful."',
        partial: 'Quase! "Garden". "My garden is beautiful."',
      },
    },
    intermediate: {
      question: 'What does "never mind" mean?',
      feedback: {
        right: 'Isso! "Never mind, it\'s not a big deal."',
        wrong: 'Errado! "Never mind". "Never mind, it\'s not a big deal."',
        partial: 'Quase! "Never mind". "Never mind, it\'s not a big deal."',
      },
    },
    advanced: {
      question: 'How would you use "hold on" in a sentence?',
      feedback: {
        right: 'Exactly! "Hold on, let me check that for you."',
        wrong: 'Not quite! "Hold on". "Hold on, let me check that for you."',
        partial: 'Almost! "Hold on". "Hold on, let me check that for you."',
      },
    },
  },
};
