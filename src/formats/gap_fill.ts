import { QuestionFormatData } from "./types";

const intermediateAdvanced = {
  question:
    'Complete: "I found the ______ between price and quality." (ponto ideal)',
  feedback: {
    right: 'Exato! "I found the sweet spot between price and quality."',
    wrong:
      'Errado! O correto é "Sweet spot". "I found the sweet spot between price and quality."',
    partial:
      'Quase! Faltou o artigo. "I found the sweet spot between price and quality."',
  },
};

export const gap_fill: QuestionFormatData = {
  format: "gap_fill",
  question_info:
    "Frase sempre em inglês. Lacuna no meio da frase cobrindo o termo fixado em contexto de uso real. Nunca em definição. Inclua sempre o significado em PT entre parênteses no final.",
  feedback_info:
    "Use sempre a frase original completada, nunca crie frase nova. Sem explicar o significado, sem descrever a palavra, sem contexto adicional.",
  levels: {
    basic: {
      question: 'Complete: "I have a ______ behind my house." (jardim)',
      feedback: {
        right: 'Exato! "I have a garden behind my house."',
        wrong: 'Errado! É "Garden" como em "I have a garden behind my house."',
        partial: 'Quase! É "garden" veja "I have a garden behind my house."',
      },
    },
    intermediate: intermediateAdvanced,
    advanced: intermediateAdvanced,
  },
};
