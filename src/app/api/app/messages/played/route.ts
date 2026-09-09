import { z, ZodError } from "zod";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { markMessageAsPlayed } from "@/src/services/message-status-service";

const PlayedSchema = z.object({
  externalId: z.string().trim().min(1),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();
    const { externalId } = PlayedSchema.parse(await request.json());
    await markMessageAsPlayed(externalId, { userId: user.id });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    console.error("[post/api/app/messages/played]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
