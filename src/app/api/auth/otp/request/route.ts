import { z, ZodError } from "zod";
import { requestOtp } from "@/src/services/otp-service";
import {
  InvalidPhoneError,
  OtpCooldownError,
} from "@/src/lib/custom-errors";

const RequestOtpSchema = z.object({
  phone: z.string().trim().min(8).max(20),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { phone } = RequestOtpSchema.parse(body);

    const { cooldownSec } = await requestOtp(phone);
    return Response.json({ cooldownSec });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "invalid payload", code: "INVALID_PHONE" },
        { status: 400 },
      );
    }
    if (error instanceof InvalidPhoneError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    if (error instanceof OtpCooldownError) {
      return Response.json(
        {
          error: error.message,
          code: error.code,
          retryAfterSec: error.retryAfterSec,
        },
        { status: 429 },
      );
    }
    console.error("[post/api/auth/otp/request]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
