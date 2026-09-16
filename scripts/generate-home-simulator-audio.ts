import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { generateSpeech } from "@/src/vendors/tts.vendor";
import { SIMULATOR_AUDIO_ITEMS } from "@/src/components/home/simulator/roteiro-data";

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), "public", "audio", "simulator");
  await mkdir(outDir, { recursive: true });

  for (const item of SIMULATOR_AUDIO_ITEMS) {
    const result = await generateSpeech(item.text);
    const label = `${item.domainId}-${item.turn}`;

    if (result.status === "error") {
      console.error(`[${label}] falhou: ${result.reason}`);
      process.exitCode = 1;
      continue;
    }

    const filePath = path.join(outDir, `${label}.ogg`);
    await writeFile(filePath, result.audio);
    console.log(`[${label}] gerado em ${filePath}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
