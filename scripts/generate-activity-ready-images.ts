import "dotenv/config";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { IMAGE_MODEL, buildImagePrompt, requestImage } from "@/src/vendors/image.vendor";
import {
  ACTIVITY_READY_IMAGE_HEIGHT,
  ACTIVITY_READY_IMAGE_WIDTH,
} from "@/src/core/activity-ready";
import { isDomainId } from "@/src/core/activity-request";
import type { DomainId } from "@/src/lib/constants";

const CANDIDATES_DIR = path.join(process.cwd(), ".image-candidates", "activity-ready");
const FINAL_DIR = path.join(process.cwd(), "public", "images", "activity-ready");
const WEBP_QUALITY = 78;

// O provedor so entrega 3:2: o corte para 16:9 tira topo e base.
const SHARED_STYLE =
  "Candid documentary photograph, unposed, as if the people do not know they are being photographed. Muted, restrained color palette with low saturation and soft contrast, neutral to slightly cool tones, overcast daylight or soft ambient light, never golden hour, never orange or warm glow. Quiet, uncluttered background. Natural, genuine expression, no looking at the camera. Only the main person or couple has a Brazilian appearance. Keep the main person's face in the central horizontal band of the frame, well away from the top and bottom edges. Absolutely no text anywhere in the image: no captions, subtitles, signs, labels, screens with writing or logos.";

const SCENES: Record<DomainId, [string, string, string]> = {
  daily_life: [
    "A Brazilian couple under a blanket on a sofa at night, seen from the side, her head on his shoulder, both laughing out loud at the series they are watching, sharing a bowl of popcorn. Faces clearly visible, softly lit by a lamp and by the light of a television that is out of frame. No screen appears in the image.",
    "A Brazilian couple on a sofa at night, seen from the front at three-quarters, caught in a lively moment of a series: one covers the mouth in surprise while laughing, the other grabs the partner's arm and points toward a television that is out of frame. Faces clearly visible, soft lamp light. No screen appears in the image.",
    "A Brazilian couple sprawled comfortably on a sofa at night, legs tangled together, turning to each other mid-laugh after a funny scene of the series they are watching, sharing snacks. Faces clearly visible, soft lamp light and light from a television that is out of frame. No screen appears in the image.",
  ],
  travel: [
    "Medium shot of a traveler with a backpack at a coffee counter in a small European cafe, ordering with an easy half smile from a blond European barista who appears out of focus in the foreground.",
    "A traveler with a small suitcase on a train platform in Northern Europe on a gray day, asking an older European local woman for directions, both seen from the side, calm and at ease.",
    "A traveler stopping on a cobblestone street in a cold European city on an overcast day, in a dark coat, talking with a local street vendor, stone buildings softly blurred behind them.",
  ],
  education: [
    "Two students walking side by side on a path of a red brick university campus in England on a cloudy autumn day, carrying books, the main student talking and the other, a blond classmate, listening.",
    "Close portrait of a student in a quiet university library, between dark wooden shelves of books with blank spines, talking softly with an East Asian classmate who appears out of focus at the shoulder.",
    "A student speaking calmly in a small university seminar, seen from behind the out-of-focus shoulders of foreign classmates, only the student in sharp focus, in a sober room with daylight from a window.",
  ],
  work: [
    "Close portrait of a professional mid-sentence in a sober glass-walled meeting room, calm and confident, with the shoulder of a foreign colleague out of focus in the foreground.",
    "Two colleagues walking and talking down a quiet office corridor in neutral tones, seen from the side, the main professional explaining something to a tall European colleague who listens with interest.",
    "A professional presenting across a table, seen from behind the out-of-focus shoulders of European and Asian colleagues, only the speaker in sharp focus, gray daylight from large windows.",
  ],
};

function candidatePath(domainId: DomainId, variation: number): string {
  return path.join(CANDIDATES_DIR, `${domainId}-${variation}.webp`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generateCandidate(
  domainId: DomainId,
  variation: number,
  scene: string,
): Promise<void> {
  const label = `${domainId}-${variation}`;
  const { result } = await requestImage(
    buildImagePrompt(`${scene}\n\n${SHARED_STYLE}`, "landscape"),
    {
      model: IMAGE_MODEL,
      quality: "medium",
      outputFormat: "webp",
      outputCompression: 100,
      orientation: "landscape",
      timeoutMs: 180_000,
    },
  );

  if (result.status === "error") {
    console.error(`[${label}] falhou: ${result.reason}`);
    process.exitCode = 1;
    return;
  }

  await writeFile(candidatePath(domainId, variation), result.image);
  console.log(`[${label}] gerado`);
}

async function generateCandidates(isForce: boolean): Promise<void> {
  await mkdir(CANDIDATES_DIR, { recursive: true });

  for (const [domainId, scenes] of Object.entries(SCENES) as [DomainId, string[]][]) {
    for (let variation = 1; variation <= scenes.length; variation++) {
      if (!isForce && (await fileExists(candidatePath(domainId, variation)))) {
        console.log(`[${domainId}-${variation}] ja existe, pulando`);
        continue;
      }
      await generateCandidate(domainId, variation, scenes[variation - 1]);
    }
  }
  console.log(`Candidatas em ${CANDIDATES_DIR}`);
}

function parsePick(arg: string): { domainId: DomainId; variation: number } {
  const [domainId, variation] = arg.split("=");
  if (!isDomainId(domainId) || !["1", "2", "3"].includes(variation)) {
    throw new Error(`Escolha invalida: ${arg}. Use, por exemplo, travel=2`);
  }
  return { domainId, variation: Number(variation) };
}

async function promotePick(arg: string): Promise<void> {
  const { domainId, variation } = parsePick(arg);
  const output = path.join(FINAL_DIR, `${domainId}.webp`);
  const info = await sharp(candidatePath(domainId, variation))
    .resize(ACTIVITY_READY_IMAGE_WIDTH, ACTIVITY_READY_IMAGE_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(output);
  console.log(`[${domainId}] ${output} (${Math.round(info.size / 1024)} kB)`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const pickIndex = args.indexOf("--pick");

  if (pickIndex === -1) {
    await generateCandidates(args.includes("--force"));
    return;
  }

  await mkdir(FINAL_DIR, { recursive: true });
  for (const arg of args.slice(pickIndex + 1)) {
    await promotePick(arg);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
