import type { Message } from "@/src/components/chat/types";
import { DOMAINS, type DomainId } from "@/src/lib/constants";
import type { PentagonChartInput } from "@/src/core/pentagon-chart";

export type DomainRoteiro = {
  domainId: DomainId;
  activityTitle: string;
  messages: Message[];
  summaryText: string;
  summaryTime: string;
  pentagon: PentagonChartInput;
};

export type SimulatorAudioItem = {
  domainId: DomainId;
  turn: number;
  text: string;
};

export function simulatorAudioUrl(domainId: DomainId, turn: number): string {
  return `/audio/simulator/${domainId}-${turn}.ogg`;
}

function samplePentagon(score: number): PentagonChartInput {
  return {
    current: {
      points: {
        respondidas: { fraction: 0.8, display: "20" },
        acerto: { fraction: 0.85, display: "85%" },
        revisadas: { fraction: 0.4, display: "8" },
        escuta: { fraction: 0.6, display: "6" },
        consistencia: { fraction: 0.9, display: "3" },
      },
      score,
    },
  };
}

function summaryFor(title: string): string {
  return `📊 Resumo da atividade: *${title}*\n\nEm 3 dias, você respondeu 20 de 25 perguntas, 85% de acerto entre as respondidas (17 certas e 3 erradas), sendo 2 delas revisadas mais de uma vez antes de fixar.\n\nVocê está indo bem, continue assim.`;
}

function confirmationFor(domainLabel: string, activityTitle: string): string {
  return `Pronto. A primeira pergunta chega em instantes.\n\n*Objetivo:* ${domainLabel}\n*Assunto:* ${activityTitle}\n*Foco:* Vocabulário geral`;
}

type TurnSpec = {
  domainId: DomainId;
  turn: number;
  baseTime: string;
  question: string;
  userAnswer: string;
  userTime: string;
  status: "right" | "partial" | "wrong";
  emoji: "✅" | "⚠️" | "❌";
  opening: string;
  rightAnswer?: string;
  feedbackSentence: string;
  translation: string;
  tip?: string;
};

function buildTurn(spec: TurnSpec): { messages: Message[]; audio: SimulatorAudioItem } {
  const {
    domainId,
    turn,
    baseTime,
    question,
    userAnswer,
    userTime,
    status,
    emoji,
    opening,
    rightAnswer,
    feedbackSentence,
    translation,
    tip,
  } = spec;

  const feedbackParts = [emoji, opening];
  if (status !== "right" && rightAnswer) {
    feedbackParts.push(`"${rightAnswer}".`);
  }
  feedbackParts.push(`"${feedbackSentence}"`);

  const messages: Message[] = [
    {
      id: `${domainId}-q${turn}`,
      from: "bot",
      time: baseTime,
      text: question,
    },
    {
      id: `${domainId}-a${turn}`,
      from: "user",
      time: userTime,
      text: userAnswer,
    },
    {
      id: `${domainId}-f${turn}`,
      from: "bot",
      time: userTime,
      text: feedbackParts.join(" "),
    },
    {
      id: `${domainId}-audio${turn}`,
      from: "bot",
      time: userTime,
      type: "audio",
      audioUrl: simulatorAudioUrl(domainId, turn),
      textFallback: feedbackSentence,
      translation,
    },
  ];

  if (tip) {
    messages.push({
      id: `${domainId}-tip${turn}`,
      from: "bot",
      time: userTime,
      text: `💡 ${tip}`,
    });
  }

  return {
    messages,
    audio: { domainId, turn, text: feedbackSentence },
  };
}

function buildRoteiro(
  domainId: DomainId,
  activityTitle: string,
  summaryTime: string,
  turns: TurnSpec[],
): { roteiro: DomainRoteiro; audioItems: SimulatorAudioItem[] } {
  const domainLabel = DOMAINS.find((d) => d.id === domainId)?.label ?? domainId;
  const built = turns.map(buildTurn);

  const messages: Message[] = [
    {
      id: `${domainId}-confirmation`,
      from: "bot",
      time: turns[0].baseTime,
      text: confirmationFor(domainLabel, activityTitle),
    },
    ...built.flatMap((b) => b.messages),
  ];

  return {
    roteiro: {
      domainId,
      activityTitle,
      summaryTime,
      summaryText: summaryFor(activityTitle),
      pentagon: samplePentagon(8.4),
      messages,
    },
    audioItems: built.map((b) => b.audio),
  };
}

const workResult = buildRoteiro(
  "work",
  "Reuniões e E-mails Profissionais",
  "18:20",
  [
    {
      domainId: "work",
      turn: 1,
      baseTime: "08:05",
      question: 'Complete: "Let\'s ______ the meeting to next week." (remarcar)',
      userAnswer: "reschedule",
      userTime: "08:07",
      status: "right",
      emoji: "✅",
      opening: "Exato!",
      feedbackSentence: "Let's reschedule the meeting to next week.",
      translation: "Vamos remarcar a reunião pra semana que vem.",
    },
    {
      domainId: "work",
      turn: 2,
      baseTime: "10:30",
      question:
        "Você promete ao seu chefe que vai (dar retorno) sobre o cliente até amanhã. Como se diz isso em inglês?",
      userAnswer: "give feedback",
      userTime: "10:34",
      status: "partial",
      emoji: "⚠️",
      opening: "Quase!",
      rightAnswer: "Follow up",
      feedbackSentence: "You promise your boss you'll follow up on the client by tomorrow.",
      translation: "Você promete ao seu chefe que vai dar retorno sobre o cliente até amanhã.",
      tip: '"Give feedback" existe, mas não é usado pra "retornar contato" no trabalho. "Follow up" é o termo certo aqui.',
    },
    {
      domainId: "work",
      turn: 3,
      baseTime: "14:15",
      question:
        'Qual palavra significa "prazo final" em inglês?\n\na) deadline\nb) duration\nc) delay\nd) draft',
      userAnswer: "b",
      userTime: "14:18",
      status: "wrong",
      emoji: "❌",
      opening: "Ops, errado!",
      rightAnswer: "Deadline",
      feedbackSentence: "We need to finish this before the deadline.",
      translation: "Precisamos terminar isso antes do prazo final.",
      tip: '"Duration" é sobre quanto tempo algo dura, não sobre o prazo final pra entregar algo.',
    },
    {
      domainId: "work",
      turn: 4,
      baseTime: "17:00",
      question: 'Como se diz "pauta da reunião" em inglês?',
      userAnswer: "agenda",
      userTime: "17:03",
      status: "right",
      emoji: "✅",
      opening: "Isso!",
      feedbackSentence: "Let's go over the agenda before we start.",
      translation: "Vamos revisar a pauta antes de começar.",
    },
  ],
);

const travelResult = buildRoteiro(
  "travel",
  "Inglês para Viagens Internacionais",
  "19:10",
  [
    {
      domainId: "travel",
      turn: 1,
      baseTime: "09:05",
      question: 'Complete: "I can\'t find my ______." (cartão de embarque)',
      userAnswer: "boarding pass",
      userTime: "09:08",
      status: "right",
      emoji: "✅",
      opening: "Perfeito!",
      feedbackSentence: "I can't find my boarding pass.",
      translation: "Não consigo achar meu cartão de embarque.",
    },
    {
      domainId: "travel",
      turn: 2,
      baseTime: "11:20",
      question:
        "Seu (voo de conexão) está atrasado e você corre pra não perdê-lo. Como você diria essa parte em inglês?",
      userAnswer: "connection flight",
      userTime: "11:24",
      status: "partial",
      emoji: "⚠️",
      opening: "Quase lá!",
      rightAnswer: "Connecting flight",
      feedbackSentence: "Your connecting flight is delayed and you're running to catch it.",
      translation: "Seu voo de conexão está atrasado e você está correndo pra pegá-lo.",
      tip: 'O certo é "connecting flight", com -ing. "Connection flight" não é uma expressão usada em inglês.',
    },
    {
      domainId: "travel",
      turn: 3,
      baseTime: "15:40",
      question:
        'Qual das opções significa "mala perdida" em inglês?\n\na) lost luggage\nb) heavy luggage\nc) hand luggage\nd) spare luggage',
      userAnswer: "c",
      userTime: "15:43",
      status: "wrong",
      emoji: "❌",
      opening: "Ops, não é isso!",
      rightAnswer: "Lost luggage",
      feedbackSentence: "I need to report my lost luggage.",
      translation: "Preciso comunicar que perdi minha mala.",
      tip: '"Hand luggage" é a bagagem de mão, não tem relação com bagagem perdida.',
    },
    {
      domainId: "travel",
      turn: 4,
      baseTime: "17:50",
      question: 'Como se diz "portão de embarque" em inglês?',
      userAnswer: "gate",
      userTime: "17:53",
      status: "right",
      emoji: "✅",
      opening: "Boa!",
      feedbackSentence: "Please proceed to gate twelve for boarding.",
      translation: "Por favor, dirija-se ao portão doze para embarque.",
    },
  ],
);

const educationResult = buildRoteiro(
  "education",
  "Vocabulário de Universidade e Aulas",
  "18:45",
  [
    {
      domainId: "education",
      turn: 1,
      baseTime: "08:35",
      question: 'Complete: "I need to submit my ______ by Monday." (trabalho acadêmico)',
      userAnswer: "assignment",
      userTime: "08:38",
      status: "right",
      emoji: "✅",
      opening: "Correto!",
      feedbackSentence: "I need to submit my assignment by Monday.",
      translation: "Preciso entregar meu trabalho até segunda-feira.",
    },
    {
      domainId: "education",
      turn: 2,
      baseTime: "12:00",
      question:
        "Você recebe um aviso de que a (mensalidade) vence na próxima semana. Como se diz isso em inglês?",
      userAnswer: "monthly fee",
      userTime: "12:04",
      status: "partial",
      emoji: "⚠️",
      opening: "Por pouco!",
      rightAnswer: "Tuition",
      feedbackSentence: "You get a notice that the tuition is due next week.",
      translation: "Você recebe um aviso de que a mensalidade vence na próxima semana.",
      tip: '"Monthly fee" existe, mas o termo específico pra mensalidade de faculdade é "tuition".',
    },
    {
      domainId: "education",
      turn: 3,
      baseTime: "16:10",
      question:
        'Qual palavra significa "bolsa de estudos" em inglês?\n\na) scholarship\nb) sponsorship\nc) internship\nd) fellowship',
      userAnswer: "d",
      userTime: "16:14",
      status: "wrong",
      emoji: "❌",
      opening: "Hmmm, errou!",
      rightAnswer: "Scholarship",
      feedbackSentence: "She applied for a scholarship to study abroad.",
      translation: "Ela se candidatou a uma bolsa de estudos pra estudar no exterior.",
      tip: '"Fellowship" também é um tipo de apoio financeiro, mas em contexto de pesquisa avançada, não de bolsa de graduação.',
    },
    {
      domainId: "education",
      turn: 4,
      baseTime: "18:00",
      question: 'Como se diz "orientador" (de curso) em inglês?',
      userAnswer: "advisor",
      userTime: "18:03",
      status: "right",
      emoji: "✅",
      opening: "Exato!",
      feedbackSentence: "My advisor helped me choose the right courses.",
      translation: "Meu orientador me ajudou a escolher as disciplinas certas.",
    },
  ],
);

const dailyLifeResult = buildRoteiro(
  "daily_life",
  "Vocabulário do Dia a Dia",
  "19:30",
  [
    {
      domainId: "daily_life",
      turn: 1,
      baseTime: "09:20",
      question: 'Complete: "Just ______, it\'s not a big deal." (deixa pra lá)',
      userAnswer: "never mind",
      userTime: "09:22",
      status: "right",
      emoji: "✅",
      opening: "Isso!",
      feedbackSentence: "Just never mind, it's not a big deal.",
      translation: "Deixa pra lá, não é nada demais.",
    },
    {
      domainId: "daily_life",
      turn: 2,
      baseTime: "13:05",
      question:
        "Você passou o fim de semana inteiro (maratonando) a série nova. Como se diz isso em inglês?",
      userAnswer: "watching a lot",
      userTime: "13:07",
      status: "partial",
      emoji: "⚠️",
      opening: "Quase!",
      rightAnswer: "Binge-watch",
      feedbackSentence: "You spent the whole weekend binge-watching the new show.",
      translation: "Você passou o fim de semana inteiro maratonando a série nova.",
      tip: '"Watching a lot" funciona, mas "binge-watch" é o termo específico pra maratonar uma série.',
    },
    {
      domainId: "daily_life",
      turn: 3,
      baseTime: "16:45",
      question:
        'Qual palavra significa "compras de mercado" em inglês?\n\na) groceries\nb) grocery\nc) market\nd) shopping',
      userAnswer: "d",
      userTime: "16:48",
      status: "wrong",
      emoji: "❌",
      opening: "Errado!",
      rightAnswer: "Groceries",
      feedbackSentence: "I need to buy some groceries for dinner.",
      translation: "Preciso comprar umas compras de mercado pro jantar.",
      tip: '"Shopping" é compras em geral. Pra compras de mercado/comida, o termo é "groceries".',
    },
    {
      domainId: "daily_life",
      turn: 4,
      baseTime: "20:00",
      question: 'Como se diz "resenha" (crítica de filme/série) em inglês?',
      userAnswer: "review",
      userTime: "20:02",
      status: "right",
      emoji: "✅",
      opening: "Perfeito!",
      feedbackSentence: "I read a great review of that movie.",
      translation: "Eu li uma ótima resenha desse filme.",
    },
  ],
);

export const SIMULATOR_ROTEIROS: Record<DomainId, DomainRoteiro> = {
  work: workResult.roteiro,
  travel: travelResult.roteiro,
  education: educationResult.roteiro,
  daily_life: dailyLifeResult.roteiro,
};

export const SIMULATOR_AUDIO_ITEMS: SimulatorAudioItem[] = [
  ...workResult.audioItems,
  ...travelResult.audioItems,
  ...educationResult.audioItems,
  ...dailyLifeResult.audioItems,
];
