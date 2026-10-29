import { z, ZodError } from "zod";
import { requireAuth } from "@/src/lib/auth/current-user";
import {
  SupportDeliveryError,
  UnauthorizedError,
} from "@/src/lib/custom-errors";
import { SUPPORT_MESSAGE_MAX_LENGTH } from "@/src/lib/constants";
import { sendSupportRequest } from "@/src/services/support-service";

const SupportSchema = z.object({
  message: z.string().trim().min(1).max(SUPPORT_MESSAGE_MAX_LENGTH),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();
    const { message } = SupportSchema.parse(await request.json());
    await sendSupportRequest(user, message);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    if (error instanceof SupportDeliveryError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 502 },
      );
    }
    console.error("[post/api/app/support]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
