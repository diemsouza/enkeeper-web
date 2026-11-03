import "dotenv/config";
import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { IMAGE_MODEL, buildImagePrompt, requestImage } from "@/src/vendors/image.vendor";
import { BLOG_PRACTICE_EXAMPLES } from "@/src/content/blog/practice-examples";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Mesmo prompt e orientacao da pergunta de imagem do app (landscape).
async function main(): Promise<void> {
  const isForce = process.argv.includes("--force");

  for (const [slug, example] of Object.entries(BLOG_PRACTICE_EXAMPLES)) {
    if (!example.image) continue;
    const filePath = path.join(process.cwd(), "public", example.image.url);

    if (!isForce && (await fileExists(filePath))) {
      console.log(`[${slug}] ja existe, pulando`);
      continue;
    }

    const { result } = await requestImage(
      buildImagePrompt(example.image.description, "landscape"),
      {
        model: IMAGE_MODEL,
        quality: "high",
        outputFormat: "webp",
        outputCompression: 75,
        orientation: "landscape",
        timeoutMs: 180_000,
      },
    );

    if (result.status === "error") {
      console.error(`[${slug}] falhou: ${result.reason}`);
      process.exitCode = 1;
      continue;
    }

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, result.image);
    console.log(`[${slug}] gerado em ${filePath}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
