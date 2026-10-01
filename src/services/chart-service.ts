import { ulid } from "ulid";
import {
  generatePentagonChartSvg,
  PentagonSeries,
} from "../core/pentagon-chart";
import { generateGaugeChartSvg } from "../core/gauge-chart";
import { renderSvgToPng } from "../vendors/chart-renderer.vendor";
import { uploadFile } from "../vendors/storage.vendor";
import { createMedia } from "../repo/media.repo";
import { updateActivity } from "../repo/activities.repo";
import {
  CHART_FOLDER,
  MEDIA_PARENT_TYPE,
  MEDIA_SOURCE,
} from "../lib/constants";
import { buildMediaPath } from "../lib/utils";
import { ACTIVITY_ELIGIBLE_SCORE, QUESTION_CAP } from "../lib/activity-score";

async function renderAndStore(
  svg: string,
  activityId: string,
  userId: string,
): Promise<string> {
  const { png, width, height } = renderSvgToPng(svg);
  const mediaId = ulid();
  const mediaPath = buildMediaPath(CHART_FOLDER, mediaId, "png");
  await uploadFile({
    filePath: mediaPath,
    file: new Blob([new Uint8Array(png)], { type: "image/png" }),
  });
  await createMedia({
    id: mediaId,
    userId,
    source: MEDIA_SOURCE.SYSTEM,
    parentId: activityId,
    parentType: MEDIA_PARENT_TYPE.ACTIVITY,
    mediaType: "image",
    contentType: "image/png",
    mediaPath,
    mediaSize: png.length,
    metadata: { width, height },
  });
  return mediaId;
}

export async function buildPentagonChartImage(
  activityId: string,
  userId: string,
  current: PentagonSeries,
  previous?: PentagonSeries,
): Promise<string | null> {
  try {
    const svg = generatePentagonChartSvg({ current, previous });
    const chartMediaId = await renderAndStore(svg, activityId, userId);
    await updateActivity(activityId, userId, {
      chartCompletedMediaId: chartMediaId,
    });
    return chartMediaId;
  } catch (err) {
    console.error("[chart-service] pentagon render failed:", err);
    return null;
  }
}

export async function buildGaugeChartImage(
  activityId: string,
  userId: string,
  score: number,
): Promise<string | null> {
  try {
    const svg = generateGaugeChartSvg({
      score,
      scoreMax: QUESTION_CAP,
      swapThreshold: ACTIVITY_ELIGIBLE_SCORE,
    });
    const chartMediaId = await renderAndStore(svg, activityId, userId);
    await updateActivity(activityId, userId, {
      chartRoundMediaId: chartMediaId,
    });
    return chartMediaId;
  } catch (err) {
    console.error("[chart-service] gauge render failed:", err);
    return null;
  }
}
