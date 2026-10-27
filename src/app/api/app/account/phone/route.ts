import { z, ZodError } from "zod";
import { requireAuth } from "@/src/lib/auth/current-user";
import { confirmAccountPhone } from "@/src/services/account-phone-service";
import {
  InvalidPhoneError,
  OtpAttemptsExceededError,
  OtpExpiredError,
  OtpInvalidError,
  PhoneTakenError,
  UnauthorizedError,
} from "@/src/lib/custom-errors";

const ConfirmPhoneSchema = z.object({
  phone: z.string().trim().min(8).max(20),
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();
    const { phone, code } = ConfirmPhoneSchema.parse(await request.json());
    await confirmAccountPhone(user.id, phone, code);
    return Response.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: "invalid payload", code: "OTP_INVALID" },
        { status: 400 },
      );
    }
    if (
      error instanceof InvalidPhoneError ||
      error instanceof OtpInvalidError ||
      error instanceof OtpExpiredError
    ) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    if (error instanceof OtpAttemptsExceededError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 429 },
      );
    }
    if (error instanceof PhoneTakenError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 409 },
      );
    }
    console.error("[post/api/app/account/phone]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
