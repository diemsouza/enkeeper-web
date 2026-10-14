import { z, ZodError } from "zod";
import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { SUBSCRIPTION_INTERVAL } from "@/src/lib/constants";
import { getOrCreateCheckoutUrl } from "@/src/services/stripe-checkout-service";

const CheckoutSchema = z.object({
  interval: z.enum([
    SUBSCRIPTION_INTERVAL.MONTHLY,
    SUBSCRIPTION_INTERVAL.YEARLY,
  ]),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireAuth();
    const { interval } = CheckoutSchema.parse(await request.json());
    const url = await getOrCreateCheckoutUrl(user.id, interval);
    return Response.json({ url });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }
    console.error("[post/api/app/billing/checkout]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
