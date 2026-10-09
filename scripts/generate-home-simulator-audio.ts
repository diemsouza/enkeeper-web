import "dotenv/config";
import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { generateSpeech } from "@/src/vendors/tts.vendor";
import { SIMULATOR_AUDIO_ITEMS } from "@/src/components/home/simulator/roteiro-data";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), "public", "audio", "simulator");
  await mkdir(outDir, { recursive: true });
  const isForce = process.argv.includes("--force");

  for (const item of SIMULATOR_AUDIO_ITEMS) {
    const label = `${item.domainId}-${item.turn}`;
    const filePath = path.join(outDir, `${label}.ogg`);

    if (!isForce && (await fileExists(filePath))) {
      console.log(`[${label}] ja existe, pulando`);
      continue;
    }

    const result = await generateSpeech(item.text);

    if (result.status === "error") {
      console.error(`[${label}] falhou: ${result.reason}`);
      process.exitCode = 1;
      continue;
    }

    await writeFile(filePath, result.audio);
    console.log(`[${label}] gerado em ${filePath}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
