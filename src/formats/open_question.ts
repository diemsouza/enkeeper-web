import { QuestionFormatData } from "./types";

export const open_question: QuestionFormatData = {
  format: "open_question",
  question_info:
    "Pergunta direta extraída ou baseada no material. Resposta objetiva.",
  feedback_info:
    "Confirma com a resposta correta em frase de uso real. Sem explicação adicional.",
  levels: {
    basic: {
      question: "O que acontece quando você pratica vocabulário todo dia?",
      feedback: {
        right: "Isso! O vocabulário fixa com mais facilidade.",
        wrong: "Errado! Praticar todo dia faz o vocabulário fixar.",
        partial: "Quase! Praticar todo dia faz o vocabulário fixar.",
      },
    },
    intermediate: {
      question: "What happens when you find the sweet spot in your studies?",
      feedback: {
        right: "Isso! Learning becomes more efficient and consistent.",
        wrong: "Errado! Finding the sweet spot makes learning more efficient.",
        partial: "Quase! Finding the sweet spot makes learning more efficient.",
      },
    },
    advanced: {
      question:
        "Why is consistency more effective than intensity when learning a language?",
      feedback: {
        right:
          "Exactly! Consistent practice builds long-term retention better than occasional intense sessions.",
        wrong:
          "Not quite! Consistency beats intensity because it reinforces memory over time.",
        partial:
          "Almost! Consistency beats intensity because it reinforces memory over time.",
      },
    },
  },
};
