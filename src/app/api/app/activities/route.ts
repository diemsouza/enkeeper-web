import { after } from "next/server";
import { z, ZodError } from "zod";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { resolveChannel } from "@/src/lib/channels/resolve-channel";
import {
  ACTIVITY_TEXT_MAX_CHARS,
  DOMAINS,
  MAX_ACTIVITY_FOCUS,
  MAX_DOC_ITEMS_PER_DOC,
} from "@/src/lib/constants";
import { isValidFocusKey } from "@/src/core/focus";
import {
  createTextActivity,
  prepareMaterialActivity,
  prepareTextActivity,
  startMaterialActivity,
} from "@/src/services/new-activity-service";
import { toActivityOutcomeResponse } from "./outcome-status";

const LevelSchema = z.enum(["basic", "intermediate", "advanced"]);
const DomainSchema = z.enum(
  DOMAINS.map((domain) => domain.id) as [
    (typeof DOMAINS)[number]["id"],
    ...(typeof DOMAINS)[number]["id"][],
  ],
);

const CreateActivitySchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("text"),
    text: z.string().trim().min(1).max(ACTIVITY_TEXT_MAX_CHARS),
    level: LevelSchema,
    domainKey: DomainSchema,
    focusKeys: z
      .array(z.string().refine(isValidFocusKey))
      .max(MAX_ACTIVITY_FOCUS),
  }),
  z.object({
    source: z.literal("material"),
    level: LevelSchema,
    items: z
      .array(
        z.object({
          messageId: z.string().min(1),
          mediaType: z.enum(["image", "pdf", "text"]),
          fileName: z.string().max(255),
          sizeBytes: z.number().int().nonnegative(),
          text: z.string().optional(),
          mediaId: z.string().optional(),
        }),
      )
      .min(1)
      .max(MAX_DOC_ITEMS_PER_DOC),
  }),
]);

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();
    const body = CreateActivitySchema.parse(await request.json());

    if (body.source === "text") {
      const { text, level, domainKey, focusKeys } = body;
      const outcome = await prepareTextActivity(user, {
        text,
        level,
        domainKey,
        focusKeys,
      });
      if (outcome.status !== "created") return toActivityOutcomeResponse(outcome);
      after(() => createTextActivity(user.id, outcome.request, resolveChannel()));
      return toActivityOutcomeResponse({ status: "created" });
    }

    const outcome = await prepareMaterialActivity(user, body.level, body.items);
    if (outcome.status !== "created") return toActivityOutcomeResponse(outcome);
    after(() =>
      startMaterialActivity(
        user.id,
        outcome.docId,
        outcome.latestDocItemId,
        resolveChannel(),
      ),
    );
    return toActivityOutcomeResponse({ status: "created" });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    console.error("[post/api/app/activities]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
