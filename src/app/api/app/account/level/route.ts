import { z, ZodError } from "zod";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { updateUserLevel } from "@/src/repo/users.repo";

const LevelSchema = z.object({
  level: z.enum(["basic", "intermediate", "advanced"]),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();
    const { level } = LevelSchema.parse(await request.json());
    await updateUserLevel(user.id, level);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    console.error("[post/api/app/account/level]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
