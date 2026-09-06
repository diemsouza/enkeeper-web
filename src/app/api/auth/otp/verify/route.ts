import { z, ZodError } from "zod";
import { verifyOtp } from "@/src/services/otp-service";
import { setSessionCookie } from "@/src/lib/auth/session-cookie";
import {
  InvalidPhoneError,
  OtpAttemptsExceededError,
  OtpExpiredError,
  OtpInvalidError,
} from "@/src/lib/custom-errors";

const VerifyOtpSchema = z.object({
  phone: z.string().trim().min(8).max(20),
  code: z.string().trim().regex(/^\d{6}$/),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { phone, code } = VerifyOtpSchema.parse(body);

    const { user } = await verifyOtp(phone, code);
    await setSessionCookie(user.id);
    return Response.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "invalid payload", code: "OTP_INVALID" },
        { status: 400 },
      );
    }
    if (error instanceof InvalidPhoneError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    if (error instanceof OtpInvalidError) {
      return Response.json(
        {
          error: error.message,
          code: error.code,
          attemptsRemaining: error.attemptsRemaining,
        },
        { status: 400 },
      );
    }
    if (error instanceof OtpExpiredError) {
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
    console.error("[post/api/auth/otp/verify]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
