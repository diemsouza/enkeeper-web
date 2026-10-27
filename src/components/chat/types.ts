import type {
  FormattedMessage,
  FormattedMessageButton,
} from "@/src/types/out-message";

export type { FormattedMessageButton };

export type MessageStatus = "sending" | "sent" | "failed";

export interface Message {
  id: string;
  from: "user" | "bot";
  text?: string;
  time: string;
  date?: string;
  status?: MessageStatus;
  type?: "file" | "audio" | "voice" | "image";
  fileName?: string;
  fileSize?: string;
  mediaType?: "image" | "pdf" | "text";
  audioUrl?: string;
  audioContentType?: string;
  // question: audio do enunciado (caption em cima, sem traducao).
  audioKind?: "question" | "feedback";
  imageUrl?: string;
  imageAlt?: string;
  // Dimensoes da imagem: a bolha ja nasce com a altura final.
  imageWidth?: number;
  imageHeight?: number;
  caption?: string;
  textFallback?: string;
  translation?: string;
  // Audio enviado pelo usuario: texto transcrito, ausente ate o servidor
  // salvar a mensagem e em audio sem fala.
  transcription?: string;
  externalId?: string;
  duration?: string;
  interactive?: FormattedMessage["interactive"] | null;
  // Id do botao de opcao clicado, guardado para o reenvio da mensagem.
  buttonId?: string;
  // "Voce respondeu sua primeira pergunta dessa atividade": pausa usada para
  // pedir o numero em conta sem telefone.
  isFirstFeedbackGuide?: boolean;
  // Pergunta, feedback ou dica (isStudyMessage): decide o auto scroll.
  isStudy?: boolean;
}
