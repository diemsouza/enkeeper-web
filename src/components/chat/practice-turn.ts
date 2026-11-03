import type { Message } from "./types";

export type PracticeTurnStatus = "right" | "partial" | "wrong";

export type PracticeTurnSpec = {
  idPrefix: string;
  time: string;
  userAnswer: string;
  status: PracticeTurnStatus;
  emoji: "✅" | "⚠️" | "❌";
  opening: string;
  rightAnswer?: string;
  feedbackSentence: string;
  // image_transcription: correcao do resto da frase, em paragrafo proprio.
  feedbackNote?: string;
  translation: string;
  tip?: string;
  // Sem arquivo de audio, o balao do player nao entra.
  audioUrl?: string;
};

export type PracticeQuestionImage = {
  url: string;
  alt: string;
  width: number;
  height: number;
};

export type PracticeQuestionSpec = {
  id: string;
  time: string;
  text: string;
  options?: string[];
  selectedOption?: string;
  image?: PracticeQuestionImage;
};

function buildFeedbackText(spec: PracticeTurnSpec): string {
  const parts = [spec.emoji, spec.opening];
  if (spec.status !== "right" && spec.rightAnswer) {
    parts.push(`"${spec.rightAnswer}".`);
  }
  parts.push(`"${spec.feedbackSentence}"`);
  const text = parts.join(" ");
  return spec.feedbackNote ? `${text}\n\n${spec.feedbackNote}` : text;
}

// Opcoes ja respondidas: travadas, com a escolhida marcada.
function buildAnsweredOptions(
  spec: PracticeQuestionSpec,
  options: string[],
): NonNullable<Message["interactive"]> {
  const buttons = options.map((label, i) => ({
    id: `${spec.id}_option_${i + 1}`,
    label,
  }));
  return {
    body: spec.text,
    buttons,
    isOptionList: true,
    disabled: true,
    selectedId: buttons.find((b) => b.label === spec.selectedOption)?.id,
  };
}

// Pergunta no formato do chat: texto, opcoes respondidas e imagem opcionais.
// Usado pelo simulador da home e pelos exemplos de pratica do blog.
export function buildPracticeQuestionMessage(spec: PracticeQuestionSpec): Message {
  const base: Message = { id: spec.id, from: "bot", time: spec.time, text: spec.text };
  const interactive = spec.options ? buildAnsweredOptions(spec, spec.options) : undefined;
  if (!spec.image) return interactive ? { ...base, interactive } : base;

  return {
    ...base,
    type: "image",
    imageUrl: spec.image.url,
    imageAlt: spec.image.alt,
    imageWidth: spec.image.width,
    imageHeight: spec.image.height,
    caption: spec.text,
    interactive,
  };
}

// Resposta do aluno, feedback, audio e dica no formato do chat. Usado pelo
// simulador da home e pelos exemplos de pratica do blog.
export function buildPracticeTurnMessages(spec: PracticeTurnSpec): Message[] {
  const { idPrefix, time } = spec;
  const messages: Message[] = [
    { id: `${idPrefix}-a`, from: "user", time, text: spec.userAnswer },
    { id: `${idPrefix}-f`, from: "bot", time, text: buildFeedbackText(spec) },
  ];
  if (spec.audioUrl) {
    messages.push({
      id: `${idPrefix}-audio`,
      from: "bot",
      time,
      type: "audio",
      audioUrl: spec.audioUrl,
      textFallback: spec.feedbackSentence,
      translation: spec.translation,
    });
  }
  if (spec.tip) {
    messages.push({ id: `${idPrefix}-tip`, from: "bot", time, text: `💡 ${spec.tip}` });
  }
  return messages;
}
