import { stripe } from "../vendors/stripe.vendor";
import { findUserById, updateUserCheckoutData } from "../repo/users.repo";
import { CheckoutData } from "../types/domain";

const CHECKOUT_EXPIRES_SECONDS = 86400;

export async function getOrCreateCheckoutUrl(userId: string): Promise<string> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error(`[getOrCreateCheckoutUrl] user not found: ${userId}`);
  }

  const checkoutData = user.checkoutData as CheckoutData | null;
  if (checkoutData && new Date(checkoutData.expiresAt) > new Date()) {
    console.log("[getOrCreateCheckoutUrl] cache hit", { userId });
    return checkoutData.url;
  }

  console.log("[getOrCreateCheckoutUrl] creating checkout session", { userId });

  try {
    const session = await stripe.checkout.sessions.create({
      client_reference_id: userId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      mode: "payment",
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_SECONDS,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment?status=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment?status=canceled`,
    });

    if (!session.url) {
      throw new Error(`[getOrCreateCheckoutUrl] session created without url: ${session.id}`);
    }

    const expiresAt = new Date(session.expires_at * 1000).toISOString();
    await updateUserCheckoutData(userId, { url: session.url, expiresAt });

    console.log("[getOrCreateCheckoutUrl] checkout session created", {
      userId,
      sessionId: session.id,
    });

    return session.url;
  } catch (err) {
    console.error("[getOrCreateCheckoutUrl] failed to create checkout session", {
      userId,
      err,
    });
    throw err;
  }
}
