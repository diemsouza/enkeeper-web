export const FAQ_IDS = [
  "what-is",
  "how-it-works",
  "vs-generic-ai",
  "english-level",
  "spaced-repetition",
  "any-content-works",
  "skills",
  "platform",
  "message-frequency",
  "does-it-replace-classes",
  "after-trial",
  "cancel-anytime",
] as const;

export type FaqId = (typeof FAQ_IDS)[number];
