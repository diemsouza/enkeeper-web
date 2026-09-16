export const FAQ_IDS = [
  "how-it-works",
  "does-it-replace-classes",
  "any-content-works",
  "after-trial",
  "message-frequency",
  "cancel-anytime",
] as const;

export type FaqId = (typeof FAQ_IDS)[number];
