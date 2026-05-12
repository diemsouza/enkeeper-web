import { QuestionFormatData } from "./types";

export const choice: QuestionFormatData = {
  format: "choice",
  description: "Duas opções apresentadas como botões. Resposta correta em answerKeys, opções em questionOptions.",
  levels: {
    basic: {
      question_example: "Qual palavra significa \"jardim\" em inglês?",
      feedback: {
        right: "Isso! \"Garden\" — \"My garden is beautiful.\"",
        wrong: "Não foi dessa vez! É \"garden\", não \"garage\" — \"My garden is beautiful.\"",
      },
    },
    intermediate: {
      question_example: "Qual expressão usaria pra dizer \"deixa pra lá\"?",
      feedback: {
        right: "Isso! \"Never mind, it's not a big deal.\"",
        wrong: "Não foi dessa vez! \"Never mind\" é o certo — \"Never mind, it's not a big deal.\"",
      },
    },
    advanced: {
      question_example: "Which expression means the perfect balance point?",
      feedback: {
        right: "Correto! \"That's the sweet spot between speed and quality.\"",
        wrong: "Não foi dessa vez! \"Sweet spot\" — \"That's the sweet spot between speed and quality.\"",
      },
    },
  },
};
