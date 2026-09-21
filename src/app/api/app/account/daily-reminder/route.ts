import { z, ZodError } from "zod";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { getDailyReminderTimeSlots } from "@/src/core/daily-reminder-time";
import { updateUserDailyReminder } from "@/src/repo/users.repo";

const [firstSlot, ...restSlots] = getDailyReminderTimeSlots();

const DailyReminderSchema = z.object({
  enabled: z.boolean(),
  time: z.enum([firstSlot, ...restSlots]),
  timezone: z.string().trim().min(1),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();
    const { enabled, time, timezone } = DailyReminderSchema.parse(
      await request.json(),
    );
    await updateUserDailyReminder(user.id, { enabled, time, timezone });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    console.error("[post/api/app/account/daily-reminder]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
