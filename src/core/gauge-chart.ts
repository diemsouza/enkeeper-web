/**
 * Geração do card visual "score da rodada", enviado no aviso de conclusão
 * da primeira rodada (Product-Rules Seção 2). Função pura, mesma lógica
 * de pentagon-chart.ts: sem I/O, sem rede, só monta a string SVG.
 *
 * Escala do score e teto de aprovação devem vir do mesmo módulo que já
 * calcula a nota (ver ACTIVITY_ELIGIBLE_SCORE e QUESTION_CAP em
 * src/lib/activity-score.ts), não redeclarar esses números aqui, pra não
 * correr risco de o gauge mostrar uma marca de ponto de troca desalinhada
 * da regra real caso o teto mude no futuro.
 */

const CENTER = { x: 230, y: 200 };
const RADIUS = 150;
const STROKE_WIDTH = 22;
const CANVAS = { width: 800, height: 400 };
const LABEL_X = 470;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function polarPoint(
  angleDeg: number,
  radius: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: radius * Math.cos(rad),
    y: radius * Math.sin(rad),
  };
}

export interface GaugeChartInput {
  /** Nota da atividade nesse momento, escala 0-10 (Seção 6.3). */
  score: number;
  /** Teto da escala, importar do módulo de score. */
  scoreMax: number;
  /** Nota que dispara a sugestão de troca (🔄), importar de ACTIVITY_ELIGIBLE_SCORE. */
  swapThreshold: number;
}

export function generateGaugeChartSvg(input: GaugeChartInput): string {
  const fraction = clamp(input.score / input.scoreMax, 0, 1);
  const circumference = 2 * Math.PI * RADIUS;
  const arcLength = circumference * fraction;

  const swapFraction = clamp(input.swapThreshold / input.scoreMax, 0, 1);
  const swapAngle = -90 + 360 * swapFraction;
  const tickOuter = polarPoint(swapAngle, RADIUS);
  const tickInner = polarPoint(swapAngle, RADIUS - 18);

  const scoreLabel = input.score.toFixed(1);
  const percentLabel = `${Math.round(fraction * 100)}%`;
  const swapLabel = input.swapThreshold.toFixed(1);

  return `<svg viewBox="0 0 ${CANVAS.width} ${CANVAS.height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${CANVAS.width}" height="${CANVAS.height}" fill="#FAF9F4"/>

  <g transform="translate(${CENTER.x},${CENTER.y})">
    <circle cx="0" cy="0" r="${RADIUS}" fill="none" stroke="#E9E5D8" stroke-width="${STROKE_WIDTH}"/>

    <line x1="${tickOuter.x.toFixed(1)}" y1="${tickOuter.y.toFixed(1)}" x2="${tickInner.x.toFixed(1)}" y2="${tickInner.y.toFixed(1)}" stroke="#B0AA98" stroke-width="3"/>

    <circle cx="0" cy="0" r="${RADIUS}" fill="none" stroke="#3A73A6" stroke-width="${STROKE_WIDTH}"
            stroke-linecap="round"
            stroke-dasharray="${arcLength.toFixed(1)} ${circumference.toFixed(1)}"
            transform="rotate(-90)"/>

    <text x="0" y="8"   text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="72" fill="#201E1B">${scoreLabel}</text>
    <text x="0" y="44"  text-anchor="middle" font-family="Inter, sans-serif" font-weight="500" font-size="18" fill="#6B6659">${percentLabel}</text>
  </g>

  <g transform="translate(${LABEL_X},${CENTER.y})">
    <text x="0" y="-6" text-anchor="start" font-family="Inter, sans-serif" font-weight="700" font-size="30" fill="#201E1B">Score de prática</text>
    <text x="0" y="26" text-anchor="start" font-family="Inter, sans-serif" font-weight="500" font-size="16" fill="#6B6659">Mínimo ideal: ${swapLabel}</text>
  </g>
</svg>`;
}
