import { ulid } from "ulid";
import {
  generatePentagonChartSvg,
  PentagonSeries,
} from "../core/pentagon-chart";
import { generateGaugeChartSvg } from "../core/gauge-chart";
import { renderSvgToPng } from "../vendors/chart-renderer.vendor";
import { uploadFile } from "../vendors/storage.vendor";
import { createMedia } from "../repo/media.repo";
import { MEDIA_PARENT_TYPE } from "../lib/constants";
import { ACTIVITY_ELIGIBLE_SCORE, QUESTION_CAP } from "../lib/activity-score";

async function renderAndStore(
  svg: string,
  activityId: string,
  folder: string,
): Promise<string> {
  const png = renderSvgToPng(svg);
  const mediaPath = `${folder}/${ulid()}.png`;
  await uploadFile({
    filePath: mediaPath,
    file: new Blob([new Uint8Array(png)], { type: "image/png" }),
  });
  await createMedia({
    parentId: activityId,
    parentType: MEDIA_PARENT_TYPE.ACTIVITY,
    mediaType: "image",
    contentType: "image/png",
    mediaPath,
    mediaSize: png.length,
  });
  return mediaPath;
}

export async function buildPentagonChartImage(
  activityId: string,
  current: PentagonSeries,
  previous?: PentagonSeries,
): Promise<string | null> {
  try {
    const svg = generatePentagonChartSvg({ current, previous });
    return await renderAndStore(svg, activityId, "charts/activity-completed");
  } catch (err) {
    console.error("[chart-service] pentagon render failed:", err);
    return null;
  }
}

export async function buildGaugeChartImage(
  activityId: string,
  score: number,
): Promise<string | null> {
  try {
    const svg = generateGaugeChartSvg({
      score,
      scoreMax: QUESTION_CAP,
      swapThreshold: ACTIVITY_ELIGIBLE_SCORE,
    });
    return await renderAndStore(svg, activityId, "charts/round-completed");
  } catch (err) {
    console.error("[chart-service] gauge render failed:", err);
    return null;
  }
}
