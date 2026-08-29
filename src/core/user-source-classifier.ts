import { SITE_MESSAGE_PATTERNS, USER_SOURCE, UserSource } from "../lib/constants";

export type ClassifiedUserSource = {
  source: UserSource | null;
  sourceData: Record<string, unknown> | null;
};

export function classifyUserSource(
  referral: Record<string, unknown> | null | undefined,
  messageText: string,
): ClassifiedUserSource {
  if (referral) {
    return { source: USER_SOURCE.META_ADS, sourceData: { referral } };
  }

  const matched = SITE_MESSAGE_PATTERNS.some((pattern) =>
    messageText.includes(pattern),
  );
  if (matched) {
    return { source: USER_SOURCE.SITE, sourceData: { message: messageText } };
  }

  return { source: null, sourceData: null };
}
