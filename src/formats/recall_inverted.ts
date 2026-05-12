import { QuestionFormatData } from "./types";

export const recall_inverted: QuestionFormatData = {
  format: "recall_inverted",
  description: "Dado o termo, traga o significado ou uso em contexto.",
  levels: {
    basic: {
      question_example: "O que significa \"garden\"?",
      feedback: {
        right: "Isso! É o jardim — \"My garden is beautiful.\"",
        wrong: "Não foi dessa vez! \"Garden\" é jardim — \"My garden is beautiful.\"",
        partial: "Quase! \"Garden\" é jardim — \"My garden is beautiful.\"",
      },
    },
    intermediate: {
      question_example: "What does \"never mind\" mean?",
      feedback: {
        right: "Isso! \"Never mind, it's not a big deal.\"",
        wrong: "Não foi dessa vez! \"Never mind\" significa deixa pra lá — \"Never mind, it's not a big deal.\"",
        partial: "Quase! \"Never mind\" significa deixa pra lá — \"Never mind, it's not a big deal.\"",
      },
    },
    advanced: {
      question_example: "How would you use \"hold on\" in a sentence?",
      feedback: {
        right: "Correto! \"Hold on, let me check that for you.\"",
        wrong: "Não foi dessa vez! \"Hold on\" — \"Hold on, let me check that for you.\"",
        partial: "Quase! \"Hold on\" — \"Hold on, let me check that for you.\"",
      },
    },
  },
};
