import { QuestionFormatData } from "./types";

export const open_text: QuestionFormatData = {
  format: "open_text",
  question_info:
    "Varie entre: compreensão (ideia ou fato do conteúdo), reformulação (explique com outras palavras), produção (use vocabulário do conteúdo em nova frase) e inferência (o que o conteúdo implica mas não diz explicitamente).",
  levels: {
    basic: {
      question: "O que o texto diz sobre a importância de praticar todo dia?",
      feedback: {
        right:
          "Isso! Praticar todo dia é o que faz o vocabulário fixar de verdade.",
        wrong:
          "Errado! O texto fala sobre praticar todo dia pra fixar o vocabulário.",
        partial:
          "Quase! Faltou mencionar que a repetição é o que consolida o aprendizado.",
      },
    },
    intermediate: {
      question: 'Como você explicaria "sweet spot" com suas próprias palavras?',
      feedback: {
        right:
          'Isso! "Sweet spot" is that perfect point where everything works just right.',
        wrong:
          'Errado! "Sweet spot" é o ponto ideal, onde tudo se encaixa perfeitamente.',
        partial:
          'Quase! A ideia está certa, mas "sweet spot" é mais específico, é o ponto ideal, não só "bom".',
      },
    },
    advanced: {
      question:
        "What does the text suggest about the relationship between consistency and progress?",
      feedback: {
        right:
          "Exactly! Consistency is what turns occasional effort into real progress.",
        wrong:
          "Errado! The text argues that consistency, not intensity, drives real progress.",
        partial:
          "Almost! You got the idea, but the text emphasizes consistency over intensity.",
      },
    },
  },
};
