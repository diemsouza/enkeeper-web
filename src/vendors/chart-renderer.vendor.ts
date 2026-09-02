import { existsSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";

// Caminhos dos .ttf embutidos no bundle (ver outputFileTracingIncludes no
// next.config.ts). O nome de família dentro dos arquivos tem que bater com o
// font-family dos SVGs ("Inter" e "IBM Plex Mono"), senão o resvg cai no
// fallback dele, que não cobre acentuação PT.
const FONT_FILES = [
  join(process.cwd(), "assets", "fonts", "Inter-Bold.ttf"),
  join(process.cwd(), "assets", "fonts", "IBMPlexMono-Bold.ttf"),
];

let fontsChecked = false;

function assertFonts(): void {
  if (fontsChecked) return;
  const missing = FONT_FILES.filter((f) => !existsSync(f));
  if (missing.length > 0) {
    throw new Error(`chart fonts missing from bundle: ${missing.join(", ")}`);
  }
  fontsChecked = true;
}

export function renderSvgToPng(svg: string): Buffer {
  assertFonts();
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
    },
    fitTo: { mode: "zoom", value: 2 },
  });
  return Buffer.from(resvg.render().asPng());
}
