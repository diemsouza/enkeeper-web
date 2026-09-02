import { PentagonSeries } from "./pentagon-chart";

/**
 * Converte os sinais brutos de uma atividade nos 5 eixos normalizados do
 * pentágono (Product-Rules Seção 1). Função pura: mesma entrada, mesma saída.
 *
 * Os eixos são os componentes que alimentam o cálculo de score (Seção 6.3),
 * não o score em si. O score entra só como número na legenda.
 */

export interface ActivityChartStatsInput {
  /** right + partial + wrong das perguntas da atividade. */
  responses: number;
  /** perguntas com status "right". */
  right: number;
  /** perguntas respondidas mais de uma vez (attemptCount > 1). */
  reviews: number;
  /** mensagens de áudio enviadas nesse ciclo. */
  audiosSent: number;
  /** dessas, quantas o usuário reproduziu (playedAt != null). */
  audiosPlayed: number;
  /** dias distintos com interação do usuário no período. */
  activeDays: number;
  /** dias corridos do período (piso 1). */
  elapsedDays: number;
  /** teto do eixo "Respondidas": Activity.questionLimit. */
  questionLimit: number;
  /** média das notas das perguntas, escala 0-10. */
  score: number;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function toPentagonSeries(input: ActivityChartStatsInput): PentagonSeries {
  const elapsed = Math.max(input.elapsedDays, 1);
  const respondidas = ratio(input.responses, input.questionLimit);
  const acerto = ratio(input.right, input.responses);
  const revisadas = ratio(input.reviews, input.responses);
  const escuta = ratio(input.audiosPlayed, input.audiosSent);
  const consistencia = ratio(input.activeDays, elapsed);

  return {
    score: input.score,
    points: {
      respondidas: { fraction: respondidas, display: String(input.responses) },
      acerto: { fraction: acerto, display: pct(acerto) },
      revisadas: { fraction: revisadas, display: pct(revisadas) },
      escuta: { fraction: escuta, display: pct(escuta) },
      consistencia: { fraction: consistencia, display: pct(consistencia) },
    },
  };
}

export function countActiveDays(dates: Date[]): number {
  const days = new Set(dates.map((d) => d.toISOString().slice(0, 10)));
  return days.size;
}

export function computeElapsedDays(createdAt: Date, lastInteractionAt: Date | null): number {
  const end = lastInteractionAt ?? createdAt;
  const diffMs = end.getTime() - createdAt.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
