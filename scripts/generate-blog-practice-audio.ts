import "dotenv/config";
import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { generateSpeech } from "@/src/vendors/tts.vendor";
import { getTtsPace } from "@/src/core/tts-pace";
import {
  BLOG_AUDIO_FOLDER_URL,
  BLOG_PRACTICE_EXAMPLES,
} from "@/src/content/blog/practice-examples";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// So gera os exemplos cujo audio fica na pasta do blog; os que apontam para
// outro audio (ex: o do simulador da home) sao ignorados.
async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), "public", BLOG_AUDIO_FOLDER_URL);
  await mkdir(outDir, { recursive: true });
  const isForce = process.argv.includes("--force");

  for (const [slug, example] of Object.entries(BLOG_PRACTICE_EXAMPLES)) {
    if (!example.audioUrl?.startsWith(`${BLOG_AUDIO_FOLDER_URL}/`)) continue;
    const filePath = path.join(process.cwd(), "public", example.audioUrl);

    if (!isForce && (await fileExists(filePath))) {
      console.log(`[${slug}] ja existe, pulando`);
      continue;
    }

    const pace = example.level ? getTtsPace(example.level) : "normal";
    const result = await generateSpeech(example.feedbackSentence, pace);
    if (result.status === "error") {
      console.error(`[${slug}] falhou: ${result.reason}`);
      process.exitCode = 1;
      continue;
    }

    await writeFile(filePath, result.audio);
    console.log(`[${slug}] gerado em ${filePath}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
