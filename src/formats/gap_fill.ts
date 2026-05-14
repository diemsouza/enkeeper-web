import { QuestionFormatData } from "./types";

export const gap_fill: QuestionFormatData = {
  format: "gap_fill",
  question_info:
    "Frase sempre em inglês. Lacuna no meio da frase cobrindo o termo fixado em contexto de uso real. Nunca em definição. Inclua sempre o significado em PT entre parênteses no final.",
  feedback_info:
    "Use sempre a frase original completada, nunca crie frase nova. Sem explicação adicional.",
  levels: {
    basic: {
      question: 'Complete: "I have a ______ behind my house." (jardim)',
      feedback: {
        right: 'Exato! "I have a garden behind my house."',
        wrong: 'Errado! "Garden". "I have a garden behind my house."',
        partial: 'Quase! "Garden". "I have a garden behind my house."',
      },
    },
    intermediate: {
      question:
        'Complete: "I found the ______ between price and quality." (ponto ideal)',
      feedback: {
        right: 'Exato! "I found the sweet spot between price and quality."',
        wrong:
          'Errado! "Sweet spot". "I found the sweet spot between price and quality."',
        partial: 'Quase! "I found the sweet spot between price and quality."',
      },
    },
    advanced: {
      question:
        'Complete: "I found the ______ between price and quality." (ponto ideal)',
      feedback: {
        right: 'Exactly! "I found the sweet spot between price and quality."',
        wrong:
          'Not quite! "Sweet spot". "I found the sweet spot between price and quality."',
        partial: 'Almost! "I found the sweet spot between price and quality."',
      },
    },
  },
};
