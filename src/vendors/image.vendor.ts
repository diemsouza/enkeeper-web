import { llmUsageService } from "../services/llm-usage-service";
import { llmLogService } from "../services/llm-log-service";
import { QUESTION_IMAGE_STYLE_PROMPT } from "../lib/prompts";

export type GenerateImageResult =
  | {
      status: "success";
      image: Buffer;
      mimeType: string;
      width: number;
      height: number;
    }
  | { status: "error"; reason: string };

type ImageGenerationResponse = {
  data?: { b64_json?: string }[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
  };
};

export type ImageCallOutcome = {
  result: GenerateImageResult;
  usage: ImageGenerationResponse["usage"];
};

export const IMAGE_MODEL = "gpt-image-2.5-flare";

export type ImageOrientation = "square" | "landscape";

const IMAGE_ORIENTATIONS: Record<
  ImageOrientation,
  { width: number; height: number; composition: string }
> = {
  square: {
    width: 1024,
    height: 1024,
    composition: "Square composition, subject centered.",
  },
  landscape: {
    width: 1536,
    height: 1024,
    composition: "Wide landscape composition, subject centered.",
  },
};
const DEFAULT_IMAGE_ORIENTATION: ImageOrientation = "landscape";

function buildImageSize(orientation: ImageOrientation): string {
  const { width, height } = IMAGE_ORIENTATIONS[orientation];
  return `${width}x${height}`;
}

function buildImagePrompt(
  description: string,
  orientation: ImageOrientation,
): string {
  const { composition } = IMAGE_ORIENTATIONS[orientation];
  return `${description}\n\n${QUESTION_IMAGE_STYLE_PROMPT}\n\n${composition}`;
}

const IMAGE_QUALITY = "low";
// png ignora output_compression; WhatsApp nao aceita webp como imagem
const IMAGE_OUTPUT_FORMAT = "jpeg";
const IMAGE_OUTPUT_COMPRESSION = 80;
const IMAGE_TIMEOUT_MS = 45_000; // manter abaixo do maxDuration da rota

export type ImageRequestOptions = {
  model?: string;
  quality?: "low" | "medium" | "high";
  outputFormat?: "png" | "webp" | "jpeg";
  outputCompression?: number;
  orientation?: ImageOrientation;
  timeoutMs?: number;
};

export async function requestImage(
  prompt: string,
  options: ImageRequestOptions = {},
): Promise<ImageCallOutcome> {
  const {
    model = IMAGE_MODEL,
    quality = IMAGE_QUALITY,
    outputFormat = IMAGE_OUTPUT_FORMAT,
    outputCompression = IMAGE_OUTPUT_COMPRESSION,
    orientation = DEFAULT_IMAGE_ORIENTATION,
    timeoutMs = IMAGE_TIMEOUT_MS,
  } = options;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      quality,
      size: buildImageSize(orientation),
      output_format: outputFormat,
      output_compression: outputCompression,
      n: 1,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const detail = await res.text();
    let code = "";
    try {
      code = JSON.parse(detail)?.error?.code ?? "";
    } catch {
      // corpo não é JSON
    }
    return {
      result: {
        status: "error",
        reason: `Image API error ${res.status}${code ? ` (${code})` : ""}: ${detail.slice(0, 300)}`,
      },
      usage: undefined,
    };
  }

  const data = (await res.json()) as ImageGenerationResponse;
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    return {
      result: {
        status: "error",
        reason: "Image API response missing b64_json",
      },
      usage: data.usage,
    };
  }

  return {
    result: {
      status: "success",
      image: Buffer.from(b64, "base64"),
      mimeType: `image/${outputFormat}`,
      width: IMAGE_ORIENTATIONS[orientation].width,
      height: IMAGE_ORIENTATIONS[orientation].height,
    },
    usage: data.usage,
  };
}

async function registerImageCall(params: {
  prompt: string;
  outcome: ImageCallOutcome;
  durationMs: number;
  userId: string;
  docId: string;
}): Promise<void> {
  const { prompt, outcome, durationMs, userId, docId } = params;
  const { result, usage } = outcome;
  const inputTokens = usage?.input_tokens ?? 0;
  const outputTokens = usage?.output_tokens ?? 0;
  const cachedTokens = usage?.input_tokens_details?.cached_tokens ?? 0;

  await llmUsageService.registerUsage({
    userId,
    docId,
    usageType: "question_image",
    provider: "openai",
    model: IMAGE_MODEL,
    inputTokens,
    outputTokens,
    cachedTokens,
  });

  await llmLogService.registerLog({
    stage: "question-image",
    provider: "openai",
    model: IMAGE_MODEL,
    input: { prompt },
    output: null,
    parsedOutput:
      result.status === "success"
        ? {
            size: `${result.width}x${result.height}`,
            bytes: result.image.length,
          }
        : null,
    success: result.status === "success",
    error: result.status === "error" ? result.reason : null,
    inputTokens,
    outputTokens,
    cachedTokens,
    durationMs,
    userId,
    docId,
  });
}

export async function generateImage(
  description: string,
  ctx: { userId: string; docId: string },
  orientation: ImageOrientation = DEFAULT_IMAGE_ORIENTATION,
): Promise<GenerateImageResult> {
  const startTime = Date.now();
  const prompt = buildImagePrompt(description, orientation);
  let outcome: ImageCallOutcome;

  try {
    outcome = await requestImage(prompt, { orientation });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "TimeoutError"
        ? "timeout"
        : err instanceof Error
          ? err.message
          : "unknown image error";
    outcome = { result: { status: "error", reason }, usage: undefined };
  }

  if (outcome.result.status === "error") {
    console.error("[generateImage] Image API:", outcome.result.reason);
  }

  try {
    await registerImageCall({
      prompt,
      outcome,
      durationMs: Date.now() - startTime,
      ...ctx,
    });
  } catch (err) {
    console.error("[generateImage] register failed:", err);
  }

  return outcome.result;
}
