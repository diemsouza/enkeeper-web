import { QuestionFormatData } from "./types";

export const recall: QuestionFormatData = {
  format: "recall",
  description: "Dado o significado ou uso, traga o termo.",
  levels: {
    basic: {
      question_example: "Como se diz \"jardim\" em inglês?",
      feedback: {
        right: "Isso! \"My garden is beautiful.\"",
        wrong: "Não foi dessa vez! O correto é \"Garden\" Ex. \"My garden is beautiful.\"",
        partial: "Quase! \"Garden\" — \"My garden is beautiful.\"",
      },
    },
    intermediate: {
      question_example: "What's the expression for \"deixa pra lá\"?",
      feedback: {
        right: "Isso! \"Never mind, it's not a big deal.\"",
        wrong: "Não foi dessa vez! O certo é \"Never mind\" como em \"Never mind, it's not a big deal.\"",
        partial: "Quase! \"Never mind\" seria o correto. Veja: \"Never mind, it's not a big deal.\"",
      },
    },
    advanced: {
      question_example: "What do you say when you want someone to wait a moment?",
      feedback: {
        right: "Correto! \"Hold on, let me check that for you.\"",
        wrong: "Não foi dessa vez! \"Hold on\" — \"Hold on, let me check that for you.\"",
        partial: "Quase! \"Hold on\" Ex. \"Hold on, let me check that for you.\"",
      },
    },
  },
};
