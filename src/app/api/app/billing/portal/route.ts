import { requireAuth } from "@/src/lib/auth/current-user";
import { UnauthorizedError } from "@/src/lib/custom-errors";
import { PLANS_PATH } from "@/src/lib/constants";
import { createBillingPortalUrl } from "@/src/services/stripe-checkout-service";

function redirectTo(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}

// Sem sessão ou sem assinatura gerenciável cai na página de planos, que passa
// pelo login do middleware quando precisa.
export async function GET(): Promise<Response> {
  const plansUrl = `${process.env.NEXT_PUBLIC_APP_URL}${PLANS_PATH}`;
  try {
    const user = await requireAuth();
    const portalUrl = await createBillingPortalUrl(user.id);
    return redirectTo(portalUrl ?? plansUrl);
  } catch (error) {
    if (error instanceof UnauthorizedError) return redirectTo(plansUrl);
    console.error("[get/api/app/billing/portal]", error);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
