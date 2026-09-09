import { imageSize } from "image-size";

export type ImageDimensions = {
  width: number;
  height: number;
};

export function readImageDimensions(buffer: Buffer): ImageDimensions | null {
  try {
    const { width, height } = imageSize(buffer);
    if (typeof width !== "number" || typeof height !== "number") return null;
    return { width, height };
  } catch (err) {
    console.error("[readImageDimensions] failed to read image dimensions:", err);
    return null;
  }
}
