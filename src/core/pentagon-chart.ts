/**
 * Geração do card visual "pentágono de desempenho", enviado como imagem
 * junto do resumo de troca de atividade (Product-Rules Seção 1).
 *
 * Função pura: recebe dados já calculados (frações 0-1 por eixo, valores
 * de exibição já formatados, score 0-10), devolve string SVG. Sem I/O,
 * sem chamada de rede, sem dependência de Next/Vercel. Rasterização pra
 * PNG (resvg-js) e upload ficam em outra camada, fora deste arquivo.
 *
 * Geometria (centro, raio, ângulos dos 5 eixos) é a mesma validada nos
 * mockups do card. Rings e polígonos de dado usam a mesma função
 * `axisPoint`, então não existe drift possível entre grade e dado real.
 */

export type PentagonAxisKey =
  | "respondidas"
  | "acerto"
  | "revisadas"
  | "escuta"
  | "consistencia";

export interface PentagonAxisValue {
  /** 0 a 1, já normalizado contra o teto natural do eixo (ver Product-Rules). */
  fraction: number;
  /** Valor formatado pra exibir no card, ex: "24", "79%". */
  display: string;
}

export interface PentagonSeries {
  points: Record<PentagonAxisKey, PentagonAxisValue>;
  /** Nota da atividade, escala 0-10 (Product-Rules Seção 6.3). */
  score: number;
}

export interface PentagonChartInput {
  current: PentagonSeries;
  /**
   * Omitir quando não existir uma atividade N-2 (ex: usuário só tem uma
   * atividade concluída até agora). Nesse caso o card renderiza só a
   * camada atual, sem comparação, sem segunda legenda.
   */
  previous?: PentagonSeries;
}

const CENTER = { x: 310, y: 210 };
const MAX_R = 140;
const CANVAS = { width: 800, height: 590 };
const CHART_OFFSET = { x: 90, y: 32 };

const AXES: { key: PentagonAxisKey; angleDeg: number }[] = [
  { key: "respondidas", angleDeg: -90 },
  { key: "acerto", angleDeg: -18 },
  { key: "revisadas", angleDeg: 54 },
  { key: "escuta", angleDeg: 126 },
  { key: "consistencia", angleDeg: 198 },
];

const LABELS: Record<
  PentagonAxisKey,
  { title: string; x: number; y: number; valueY: number; anchor: "start" | "middle" | "end" }
> = {
  respondidas: { title: "Respondidas", x: 310, y: 41, valueY: 58, anchor: "middle" },
  acerto: { title: "Acerto", x: 479, y: 153, valueY: 170, anchor: "start" },
  revisadas: { title: "Revisadas", x: 413, y: 353, valueY: 370, anchor: "middle" },
  escuta: { title: "Escuta", x: 207, y: 353, valueY: 370, anchor: "middle" },
  consistencia: { title: "Consistência", x: 144, y: 153, valueY: 170, anchor: "end" },
};

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function axisPoint(angleDeg: number, fraction: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  const r = MAX_R * clamp01(fraction);
  return {
    x: CENTER.x + r * Math.cos(rad),
    y: CENTER.y + r * Math.sin(rad),
  };
}

function polygonPoints(fractionByAxis: (key: PentagonAxisKey) => number): string {
  return AXES.map((a) => {
    const p = axisPoint(a.angleDeg, fractionByAxis(a.key));
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ");
}

function gridRingPolygon(ringFraction: number): string {
  return polygonPoints(() => ringFraction);
}

function spokesSvg(): string {
  return AXES.map((a) => {
    const p = axisPoint(a.angleDeg, 1);
    return `<line x1="${CENTER.x}" y1="${CENTER.y}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#8FAEC2" stroke-opacity="0.55" stroke-width="1.2"/>`;
  }).join("\n    ");
}

function markersSvg(fractionByAxis: (key: PentagonAxisKey) => number): string {
  return AXES.map((a) => {
    const p = axisPoint(a.angleDeg, fractionByAxis(a.key));
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#3A73A6"/>`;
  }).join("\n    ");
}

function labelsSvg(series: PentagonSeries): string {
  return AXES.map((a) => {
    const label = LABELS[a.key];
    const value = series.points[a.key].display;
    return `
    <text x="${label.x}" y="${label.y}" text-anchor="${label.anchor}" font-family="Inter, sans-serif" font-weight="700" font-size="13" fill="#201E1B">${label.title}</text>
    <text x="${label.x}" y="${label.valueY}" text-anchor="${label.anchor}" font-family="IBM Plex Mono, monospace" font-weight="700" font-size="14" fill="#3A73A6">${value}</text>`;
  }).join("");
}

function legendSvg(input: PentagonChartInput): string {
  const currentScore = input.current.score.toFixed(1);

  if (!input.previous) {
    // Sem comparação disponível (ver PentagonChartInput.previous): legenda
    // única, centralizada, sem segunda camada tracejada.
    return `
  <g>
    <line x1="380" y1="505" x2="400" y2="505" stroke="#3A73A6" stroke-width="3"/>
    <text x="408" y="509" text-anchor="start" font-family="Inter, sans-serif" font-weight="700" font-size="15" fill="#201E1B">Esta atividade</text>
    <text x="408" y="531" text-anchor="start" font-family="Inter, sans-serif" font-weight="600" font-size="15" fill="#3A73A6">Score: ${currentScore}</text>
  </g>`;
  }

  const previousScore = input.previous.score.toFixed(1);

  return `
  <g>
    <line x1="210" y1="505" x2="230" y2="505" stroke="#3A73A6" stroke-width="3"/>
    <text x="238" y="509" text-anchor="start" font-family="Inter, sans-serif" font-weight="700" font-size="15" fill="#201E1B">Atividade encerrada</text>
    <text x="238" y="531" text-anchor="start" font-family="Inter, sans-serif" font-weight="600" font-size="15" fill="#3A73A6">Score: ${currentScore}</text>

    <line x1="460" y1="505" x2="480" y2="505" stroke="#4A4740" stroke-width="2.5" stroke-dasharray="5 4"/>
    <text x="488" y="509" text-anchor="start" font-family="Inter, sans-serif" font-weight="700" font-size="15" fill="#201E1B">Atividade anterior</text>
    <text x="488" y="531" text-anchor="start" font-family="Inter, sans-serif" font-weight="600" font-size="15" fill="#4A4740">Score: ${previousScore}</text>
  </g>`;
}

export function generatePentagonChartSvg(input: PentagonChartInput): string {
  const currentFraction = (key: PentagonAxisKey): number =>
    input.current.points[key].fraction;
  const currentPolygon = polygonPoints(currentFraction);

  const previousPolygonSvg = input.previous
    ? (() => {
        const previousFraction = (key: PentagonAxisKey): number =>
          input.previous!.points[key].fraction;
        return `<polygon points="${polygonPoints(previousFraction)}" fill="none" stroke="#4A4740" stroke-width="2.5" stroke-dasharray="6 5"/>`;
      })()
    : "";

  return `<svg viewBox="0 0 ${CANVAS.width} ${CANVAS.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="chartBg" cx="50%" cy="50%" r="50%">
      <stop offset="0%"  stop-color="#8FAEC2" stop-opacity="0.20"/>
      <stop offset="45%" stop-color="#8FAEC2" stop-opacity="0.10"/>
      <stop offset="72%" stop-color="#8FAEC2" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${CANVAS.width}" height="${CANVAS.height}" fill="#FAF9F4"/>

  <g transform="translate(${CHART_OFFSET.x},${CHART_OFFSET.y})">
    <circle cx="${CENTER.x}" cy="${CENTER.y + 5}" r="235" fill="url(#chartBg)"/>

    <polygon points="${gridRingPolygon(0.33)}" fill="none" stroke="#8FAEC2" stroke-opacity="0.55" stroke-width="1.2"/>
    <polygon points="${gridRingPolygon(0.66)}" fill="none" stroke="#8FAEC2" stroke-opacity="0.55" stroke-width="1.2"/>
    <polygon points="${gridRingPolygon(1)}" fill="none" stroke="#8FAEC2" stroke-opacity="0.65" stroke-width="1.4"/>

    ${spokesSvg()}

    ${previousPolygonSvg}

    <polygon points="${currentPolygon}" fill="#3A73A6" fill-opacity="0.14" stroke="#3A73A6" stroke-width="3"/>
    ${markersSvg(currentFraction)}
    ${labelsSvg(input.current)}
  </g>
${legendSvg(input)}
</svg>`;
}
