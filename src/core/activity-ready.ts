import type { DomainId } from "../lib/constants";
import { isDomainId } from "./activity-request";

export const ACTIVITY_READY_IMAGE_WIDTH = 1280;
export const ACTIVITY_READY_IMAGE_HEIGHT = 720;

export function activityReadyImageUrl(domainId: DomainId): string {
  return `/images/activity-ready/${domainId}.webp`;
}

export function buildActivityReadyText(params: {
  headline: string;
  phrase: string;
  domain: string;
  topic: string;
  focus: string;
}): string {
  const { headline, phrase, domain, topic, focus } = params;
  return `*${headline}* ${phrase}\n\n*Objetivo:* ${domain}\n*Assunto:* ${topic}\n*Foco:* ${focus}`;
}

export function readActivityReadyDomain(metadata: unknown): DomainId | null {
  if (!metadata || typeof metadata !== "object") return null;
  const { activityReadyDomain } = metadata as Record<string, unknown>;
  if (typeof activityReadyDomain !== "string") return null;
  return isDomainId(activityReadyDomain) ? activityReadyDomain : null;
}
