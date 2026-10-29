export type ActivityOutcomeStatus =
  | "created"
  | "plan_expired"
  | "daily_limit"
  | "already_creating"
  | "blocked"
  | "needs_more"
  | "insufficient_content"
  | "invalid_item";

const HTTP_STATUS: Record<ActivityOutcomeStatus, number> = {
  created: 200,
  plan_expired: 403,
  daily_limit: 429,
  already_creating: 409,
  blocked: 422,
  needs_more: 422,
  insufficient_content: 422,
  invalid_item: 400,
};

export function toActivityOutcomeResponse(
  body: { status: ActivityOutcomeStatus } & Record<string, unknown>,
): Response {
  return Response.json(body, { status: HTTP_STATUS[body.status] });
}
