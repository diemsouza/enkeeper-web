export type ActivityOutcomeBody = {
  status?: string;
  hint?: string | null;
  examples?: string[];
};

export type NewActivityFeedback =
  | { kind: "needs_more"; hint: string | null; examples: string[] }
  | { kind: "error"; messageKey: NewActivityErrorKey };

export type NewActivityErrorKey =
  | "blocked"
  | "daily_limit"
  | "already_creating"
  | "plan_expired"
  | "insufficient_content"
  | "generic";

const ERROR_KEYS: NewActivityErrorKey[] = [
  "blocked",
  "daily_limit",
  "already_creating",
  "plan_expired",
  "insufficient_content",
];

export function resolveActivityFeedback(
  body: ActivityOutcomeBody,
): NewActivityFeedback {
  if (body.status === "needs_more") {
    return {
      kind: "needs_more",
      hint: body.hint ?? null,
      examples: body.examples ?? [],
    };
  }
  const key = ERROR_KEYS.find((errorKey) => errorKey === body.status);
  return { kind: "error", messageKey: key ?? "generic" };
}
