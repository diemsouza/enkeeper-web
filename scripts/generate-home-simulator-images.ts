import "dotenv/config";
import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { requestImage } from "@/src/vendors/image.vendor";
import { QUESTION_IMAGE_STYLE_PROMPT } from "@/src/lib/prompts";
import { SIMULATOR_IMAGE_ITEMS } from "@/src/components/home/simulator/roteiro-data";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), "public", "images", "simulator");
  await mkdir(outDir, { recursive: true });
  const isForce = process.argv.includes("--force");

  for (const item of SIMULATOR_IMAGE_ITEMS) {
    const label = `${item.domainId}-${item.turn}`;
    const filePath = path.join(outDir, `${label}.webp`);

    if (!isForce && (await fileExists(filePath))) {
      console.log(`[${label}] ja existe, pulando`);
      continue;
    }

    const { result } = await requestImage(
      `${item.description}\n\n${QUESTION_IMAGE_STYLE_PROMPT}`,
      {
        model: "gpt-image-1",
        quality: "high",
        outputFormat: "webp",
        outputCompression: 75,
        orientation: "square",
        timeoutMs: 180_000,
      },
    );

    if (result.status === "error") {
      console.error(`[${label}] falhou: ${result.reason}`);
      process.exitCode = 1;
      continue;
    }

    await writeFile(filePath, result.image);
    console.log(`[${label}] gerado em ${filePath}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
