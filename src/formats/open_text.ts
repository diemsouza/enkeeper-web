import { QuestionFormatData } from "./types";

export const open_text: QuestionFormatData = {
  format: "open_text",
  question_info:
    "Varie entre: compreensão (ideia ou fato do conteúdo), reformulação (explique com outras palavras), produção (use vocabulário do conteúdo em nova frase) e inferência (o que o conteúdo implica mas não diz explicitamente).",
  feedback_info:
    "Confirma com a resposta correta em frase de uso real. Sem explicação adicional.",
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
        right: 'Isso! "Sweet spot" is that perfect point where things click.',
        wrong:
          'Errado! "Sweet spot" — o ponto onde tudo se encaixa. "That\'s the sweet spot."',
        partial:
          'Quase! A ideia está certa, mas faltou o termo: "sweet spot". "That\'s the sweet spot."',
      },
    },
    advanced: {
      question:
        "What does the text suggest about the relationship between consistency and progress?",
      feedback: {
        right:
          "Exactly! Consistency is what turns occasional effort into real progress.",
        wrong:
          "Not quite! The text argues that consistency, not intensity, drives real progress.",
        partial:
          "Almost! You got the idea, but the text emphasizes consistency over intensity.",
      },
    },
  },
};
