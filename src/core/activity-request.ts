import type { Level } from "../lib/prisma";
import {
  ACTIVITY_CREATING_TTL_MS,
  DOMAINS,
  DomainId,
  MAX_ACTIVITY_FOCUS,
  TOPIC_SUGGESTIONS,
} from "../lib/constants";
import { isValidFocusKey } from "./focus";

export const DEFAULT_FOCUS_KEY = "vocabulary";

export type ActivityRequestControls = {
  text: string;
  level: Level;
  focusKeys: string[];
  domainKey: DomainId;
};

export type ActivityRequestExtraction = {
  domainKey: string | null;
  topic: string | null;
  levelFromText: Level | null;
  focusKeysFromText: string[];
};

export type ResolvedActivityRequest = {
  domainKey: DomainId;
  topic: string;
  level: Level;
  focusKeys: string[];
};

export function isDomainId(value: string | null): value is DomainId {
  return DOMAINS.some((domain) => domain.id === value);
}

export function isUnchangedSuggestion(
  text: string,
  domainKey: DomainId,
): boolean {
  return TOPIC_SUGGESTIONS[domainKey].includes(text.trim());
}

// Os focos marcados vem primeiro; os escritos no texto completam ate o limite.
export function mergeFocusKeys(
  selected: string[],
  fromText: string[],
): string[] {
  const merged = [...selected, ...fromText].filter(isValidFocusKey);
  const unique = Array.from(new Set(merged)).slice(0, MAX_ACTIVITY_FOCUS);
  return unique.length > 0 ? unique : [DEFAULT_FOCUS_KEY];
}

export function resolveActivityRequest(
  controls: ActivityRequestControls,
  extraction: ActivityRequestExtraction | null,
): ResolvedActivityRequest {
  const text = controls.text.trim();
  if (!extraction) {
    return {
      domainKey: controls.domainKey,
      topic: text,
      level: controls.level,
      focusKeys: mergeFocusKeys(controls.focusKeys, []),
    };
  }
  return {
    domainKey: isDomainId(extraction.domainKey)
      ? extraction.domainKey
      : controls.domainKey,
    topic: extraction.topic?.trim() || text,
    level: extraction.levelFromText ?? controls.level,
    focusKeys: mergeFocusKeys(
      controls.focusKeys,
      extraction.focusKeysFromText,
    ),
  };
}

export function isActivityCreationInProgress(
  activityCreatingAt: string | null,
  now: Date,
): boolean {
  if (!activityCreatingAt) return false;
  const startedAt = new Date(activityCreatingAt).getTime();
  return now.getTime() - startedAt < ACTIVITY_CREATING_TTL_MS;
}
