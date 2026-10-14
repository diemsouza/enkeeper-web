import { stripe } from "../vendors/stripe.vendor";
import { findUserById, updateUserCheckoutData } from "../repo/users.repo";
import {
  LatestSubscription,
  findLatestSubscriptionByUser,
} from "../repo/subscriptions.repo";
import {
  canManageSubscription,
  hasOpenStripeSubscription,
} from "../core/subscription";
import {
  BILLING_PORTAL_PATH,
  PAYMENT_PROVIDER,
  PAYMENT_SUCCESS_PARAM,
  PLANS_PATH,
  SUBSCRIPTION_INTERVAL,
  SubscriptionInterval,
} from "../lib/constants";
import { CheckoutData } from "../types/domain";

const CHECKOUT_EXPIRES_SECONDS = 86400;

function resolvePriceId(interval: SubscriptionInterval): string {
  const priceId =
    interval === SUBSCRIPTION_INTERVAL.YEARLY
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;
  if (!priceId) {
    throw new Error(`[resolvePriceId] price not configured: ${interval}`);
  }
  return priceId;
}

function resolveStripeCustomerId(
  latest: LatestSubscription | null,
): string | undefined {
  if (latest?.paymentProvider !== PAYMENT_PROVIDER.STRIPE) return undefined;
  return latest.paymentCustomerId ?? undefined;
}

function isCheckoutCacheValid(
  checkoutData: CheckoutData | null,
  interval: SubscriptionInterval,
): checkoutData is CheckoutData {
  return Boolean(
    checkoutData &&
    checkoutData.interval === interval &&
    new Date(checkoutData.expiresAt) > new Date(),
  );
}

// Assinatura Stripe aberta nunca gera checkout novo, mesmo com a tela de
// planos contornada: devolve o portal para evitar cobrança duplicada.
async function resolveOpenSubscriptionPortalUrl(
  userId: string,
): Promise<string> {
  const portalUrl = await createBillingPortalUrl(userId);
  if (!portalUrl) {
    throw new Error(
      `[getOrCreateCheckoutUrl] open subscription without customer: ${userId}`,
    );
  }
  return portalUrl;
}

export async function getOrCreateCheckoutUrl(
  userId: string,
  interval: SubscriptionInterval,
): Promise<string> {
  const latest = await findLatestSubscriptionByUser(userId);
  if (hasOpenStripeSubscription(latest)) {
    return resolveOpenSubscriptionPortalUrl(userId);
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new Error(`[getOrCreateCheckoutUrl] user not found: ${userId}`);
  }

  const checkoutData = user.checkoutData as CheckoutData | null;
  if (isCheckoutCacheValid(checkoutData, interval)) {
    return checkoutData.url;
  }

  const session = await stripe.checkout.sessions.create({
    client_reference_id: userId,
    customer: resolveStripeCustomerId(latest),
    line_items: [{ price: resolvePriceId(interval), quantity: 1 }],
    mode: "subscription",
    subscription_data: { metadata: { userId } },
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_SECONDS,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?${PAYMENT_SUCCESS_PARAM}=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}${PLANS_PATH}`,
  });

  if (!session.url) {
    throw new Error(
      `[getOrCreateCheckoutUrl] session created without url: ${session.id}`,
    );
  }

  const expiresAt = new Date(session.expires_at * 1000).toISOString();
  await updateUserCheckoutData(userId, {
    url: session.url,
    expiresAt,
    interval,
  });

  return session.url;
}

export async function createBillingPortalUrl(
  userId: string,
): Promise<string | null> {
  const latest = await findLatestSubscriptionByUser(userId);
  if (!canManageSubscription(latest) || !latest?.paymentCustomerId) {
    return null;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: latest.paymentCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}${PLANS_PATH}`,
  });
  return session.url;
}

// Portal só vale para assinatura Stripe ainda aberta (trocar cartão, quitar
// fatura); sem ela, o usuário escolhe um plano e gera um checkout novo.
export async function resolveBlockedPaymentLink(
  userId: string,
): Promise<string> {
  const latest = await findLatestSubscriptionByUser(userId);
  const path = hasOpenStripeSubscription(latest)
    ? BILLING_PORTAL_PATH
    : PLANS_PATH;
  return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
}
