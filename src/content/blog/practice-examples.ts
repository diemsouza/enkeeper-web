import type {
  PracticeQuestionImage,
  PracticeTurnSpec,
} from "@/src/components/chat/practice-turn";
import type { Level } from "@/src/lib/prisma";

// image: gerada por scripts/generate-blog-practice-images.ts a partir de
// image.description, igual a pergunta de imagem do app. level: velocidade da voz
// (getTtsPace) no audio de feedback.
export type BlogPracticeExample = Omit<PracticeTurnSpec, "idPrefix"> & {
  question: string;
  questionTime: string;
  level?: Level;
  options?: string[];
  image?: PracticeQuestionImage & { description: string };
};

export const BLOG_AUDIO_FOLDER_URL = "/audio/blog";

const BLOG_PRACTICE_IMAGE_WIDTH = 1536;
const BLOG_PRACTICE_IMAGE_HEIGHT = 1024;

export function blogPracticeAudioUrl(slug: string): string {
  return `${BLOG_AUDIO_FOLDER_URL}/${slug}.ogg`;
}

export function blogPracticeImageUrl(slug: string): string {
  return `/blog/${slug}/pratica.webp`;
}

// Exemplo de "Como e praticar isso" de cada materia. O audio sai de
// scripts/generate-blog-practice-audio.ts; series reaproveita o do simulador
// da home, que e o mesmo exemplo.
export const BLOG_PRACTICE_EXAMPLES: Record<string, BlogPracticeExample> = {
  "ingles-para-entrevista-de-emprego": {
    question: 'Complete: "I have been working ______ marketing for three years." (em)',
    questionTime: "08:40",
    userAnswer: "on",
    time: "08:43",
    status: "wrong",
    emoji: "❌",
    opening: "Ops, não é isso!",
    rightAnswer: "In",
    feedbackSentence: "I have been working in marketing for three years.",
    translation: "Trabalho com marketing há três anos.",
    tip: 'Para área de atuação, o inglês usa "in": in marketing, in finance, in sales. "On" é para projeto ou tarefa: "I\'m working on a new campaign."',
    audioUrl: blogPracticeAudioUrl("ingles-para-entrevista-de-emprego"),
  },
  "ingles-para-viagem-frases-essenciais": {
    question: 'Responda em inglês: "What\'s the purpose of your visit?"',
    questionTime: "10:15",
    userAnswer: "I'm here for tourism",
    time: "10:17",
    status: "right",
    emoji: "✅",
    opening: "Isso!",
    feedbackSentence: "I'm here for tourism.",
    translation: "Estou aqui a passeio.",
    tip: 'Também vale "I\'m here on vacation". Na imigração, resposta curta é a melhor resposta.',
    audioUrl: blogPracticeAudioUrl("ingles-para-viagem-frases-essenciais"),
  },
  "ingles-para-intercambio-primeiro-mes": {
    question:
      "Escreva em inglês uma mensagem para seu colega de casa combinando dividir a conta de luz.",
    questionTime: "19:05",
    userAnswer: "Hi Sam! The electricity bill arrived. Can we split in half?",
    time: "19:09",
    status: "partial",
    emoji: "⚠️",
    opening: "Quase!",
    feedbackSentence: "Hi Sam! The electricity bill arrived. Can we split it in half?",
    translation: "Oi, Sam! Chegou a conta de luz. Podemos dividir meio a meio?",
    tip: 'Em inglês, "split" pede o objeto: "split it", "split the bill". Outro jeito natural: "Want to split it 50/50?"',
    audioUrl: blogPracticeAudioUrl("ingles-para-intercambio-primeiro-mes"),
  },
  "expressoes-em-ingles-de-series": {
    question: 'Complete: "No ______! I haven\'t watched the last episode yet." (sem spoiler)',
    questionTime: "09:20",
    userAnswer: "spoilers",
    time: "09:22",
    status: "right",
    emoji: "✅",
    opening: "Isso!",
    feedbackSentence: "No spoilers! I haven't watched the last episode yet.",
    translation: "Sem spoiler! Ainda não vi o último episódio.",
    audioUrl: "/audio/simulator/daily_life-1.ogg",
  },
  "repeticao-espacada-ingles": {
    level: "basic",
    question: 'Complete: "I keep ______ the new words I learn." (esquecendo)',
    questionTime: "07:50",
    userAnswer: "forget",
    time: "07:52",
    status: "partial",
    emoji: "⚠️",
    opening: "Quase!",
    rightAnswer: "Forgetting",
    feedbackSentence: "I keep forgetting the new words I learn.",
    translation: "Vivo esquecendo as palavras novas que aprendo.",
    tip: 'Depois de _keep_, o verbo vem com -ing: _keep forgetting_, _keep trying_.',
    audioUrl: blogPracticeAudioUrl("repeticao-espacada-ingles"),
  },
  "curso-de-ingles-e-pratica-diaria": {
    level: "intermediate",
    question:
      "Your manager can't make it today. You want to (remarcar) the meeting for Friday. How would you say this in English?",
    questionTime: "12:30",
    userAnswer: "Can we remark the meeting for Friday?",
    time: "12:33",
    status: "wrong",
    emoji: "❌",
    opening: "Ops, não é isso!",
    rightAnswer: "Reschedule",
    feedbackSentence: "Can we reschedule the meeting for Friday?",
    translation: "Podemos remarcar a reunião para sexta?",
    tip: '*Remark* em inglês é fazer um comentário. Para mudar a data de um compromisso, use _reschedule_.',
    audioUrl: blogPracticeAudioUrl("curso-de-ingles-e-pratica-diaria"),
  },
  "nivel-de-ingles-no-brasil": {
    level: "basic",
    question: "Selecione a opção em inglês que mais descreve a imagem.",
    questionTime: "07:15",
    options: ["laundry", "commute", "homework", "groceries"],
    image: {
      url: blogPracticeImageUrl("nivel-de-ingles-no-brasil"),
      alt: "Pessoa em pé num ônibus cheio de manhã, segurando um copo de café.",
      width: BLOG_PRACTICE_IMAGE_WIDTH,
      height: BLOG_PRACTICE_IMAGE_HEIGHT,
      description:
        "A person standing on a crowded city bus in the morning, holding a paper coffee cup and a handrail, looking out the window, medium shot.",
    },
    userAnswer: "commute",
    time: "07:16",
    status: "right",
    emoji: "✅",
    opening: "Correto!",
    feedbackSentence: "My commute takes forty minutes every morning.",
    translation: "Meu trajeto até o trabalho leva quarenta minutos toda manhã.",
    audioUrl: blogPracticeAudioUrl("nivel-de-ingles-no-brasil"),
  },
  "aprender-ingles-sem-intercambio": {
    level: "basic",
    question: "Veja a imagem e responda em inglês: o que essa pessoa está fazendo?",
    questionTime: "19:40",
    image: {
      url: blogPracticeImageUrl("aprender-ingles-sem-intercambio"),
      alt: "Pessoa mexendo uma panela com legumes no fogão de uma cozinha de casa.",
      width: BLOG_PRACTICE_IMAGE_WIDTH,
      height: BLOG_PRACTICE_IMAGE_HEIGHT,
      description:
        "A person cooking dinner at a home stove, stirring a pan of vegetables with a wooden spoon, warm evening light in a small kitchen, medium shot.",
    },
    userAnswer: "She is cook dinner",
    time: "19:42",
    status: "right",
    emoji: "✅",
    opening: "Boa!",
    feedbackSentence: "She is cooking dinner.",
    feedbackNote: 'Depois de "is", o verbo vem com -ing: _is cooking_.',
    translation: "Ela está fazendo o jantar.",
    audioUrl: blogPracticeAudioUrl("aprender-ingles-sem-intercambio"),
  },
  "perder-vergonha-de-falar-ingles": {
    level: "basic",
    question: 'Como se diz "constrangido" em inglês?',
    questionTime: "21:05",
    userAnswer: "constipated",
    time: "21:06",
    status: "wrong",
    emoji: "❌",
    opening: "Ops, não é isso!",
    rightAnswer: "Embarrassed",
    feedbackSentence: "I felt embarrassed when I forgot her name.",
    translation: "Fiquei constrangido quando esqueci o nome dela.",
    tip: '*Constipated* em inglês quer dizer "com prisão de ventre". Para a vergonha de uma situação, use _embarrassed_.',
    audioUrl: blogPracticeAudioUrl("perder-vergonha-de-falar-ingles"),
  },
  "entendo-ingles-mas-nao-consigo-falar": {
    level: "intermediate",
    question: 'What does "I\'m on my way" mean in Portuguese?',
    questionTime: "18:10",
    userAnswer: "estou a caminho",
    time: "18:11",
    status: "right",
    emoji: "✅",
    opening: "Exato!",
    feedbackSentence: "Hold on, I'm on my way.",
    translation: "Calma, estou a caminho.",
    audioUrl: blogPracticeAudioUrl("entendo-ingles-mas-nao-consigo-falar"),
  },
};
