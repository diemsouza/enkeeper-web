import Stripe from "stripe";
import { stripe } from "../vendors/stripe.vendor";
import {
  findUserById,
  updateUserCheckoutData,
  updateUserPlan,
} from "../repo/users.repo";
import {
  UpsertSubscriptionData,
  updateSubscriptionByPaymentSubscriptionId,
  upsertSubscriptionByPaymentSubscriptionId,
} from "../repo/subscriptions.repo";
import {
  isCancelScheduled,
  isEndedBeforePeriodEnd,
  resolveAccessAfterEarlyCancel,
  resolvePaymentMethod,
  resolveSubscriptionInterval,
} from "../core/subscription";
import { formatSubscriptionConfirmed } from "../core/formatters";
import { PAYMENT_PROVIDER, SubscriptionInterval } from "../lib/constants";
import { resolveChannel } from "../lib/channels/resolve-channel";
import { sendAndSaveMessage } from "./message-sender-service";
import { findLastActiveActivityByUser } from "../repo/activities.repo";

function resolveId(ref: string | { id: string } | null): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

function resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  return resolveId(invoice.parent?.subscription_details?.subscription ?? null);
}

async function buildSubscriptionData(
  subscriptionId: string,
): Promise<UpsertSubscriptionData> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"],
  });
  const [item] = subscription.items.data;
  const userId = subscription.metadata.userId;
  if (!item || !userId) {
    throw new Error(
      `[buildSubscriptionData] subscription without item or userId: ${subscriptionId}`,
    );
  }

  const paymentMethod = subscription.default_payment_method;
  return {
    userId,
    paymentProvider: PAYMENT_PROVIDER.STRIPE,
    paymentSubscriptionId: subscription.id,
    paymentCustomerId: resolveId(subscription.customer),
    paymentMethod:
      paymentMethod && typeof paymentMethod !== "string"
        ? resolvePaymentMethod(paymentMethod)
        : null,
    interval: resolveSubscriptionInterval(item.price.recurring?.interval ?? ""),
    amount: item.price.unit_amount ?? 0,
    currency: subscription.currency.toUpperCase(),
    status: subscription.status,
    currentPeriodEnd: new Date(item.current_period_end * 1000),
    cancelAtPeriodEnd: isCancelScheduled(subscription),
  };
}

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const subscriptionId = resolveId(session.subscription);
  if (!subscriptionId) {
    console.error("[handleCheckoutCompleted] session without subscription", {
      sessionId: session.id,
    });
    return;
  }

  const data = await buildSubscriptionData(subscriptionId);
  await upsertSubscriptionByPaymentSubscriptionId({
    ...data,
    amount: session.amount_total ?? data.amount,
  });
  await updateUserCheckoutData(data.userId, null);

  console.log("[handleCheckoutCompleted] subscription saved", {
    userId: data.userId,
    subscriptionId,
  });
}

async function sendSubscriptionConfirmed(
  userId: string,
  interval: SubscriptionInterval,
  renewsAt: Date,
  timezone: string,
): Promise<void> {
  const activeActivity = await findLastActiveActivityByUser(userId);
  await sendAndSaveMessage({
    channel: resolveChannel(),
    userId,
    activityId: activeActivity?.id,
    message: formatSubscriptionConfirmed(interval, renewsAt, timezone),
    intent: "payment_confirmed",
  });
}

// Idempotência pelo próprio valor: reenvio do mesmo invoice.paid encontra o
// planExpiresAt já gravado e não reenvia a confirmação. A mensagem sai só na
// primeira cobrança; renovação atualiza o acesso em silêncio.
async function applyPaidPeriodToUser(
  userId: string,
  interval: SubscriptionInterval,
  planExpiresAt: Date,
  shouldNotify: boolean,
): Promise<void> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error(`[applyPaidPeriodToUser] user not found: ${userId}`);
  }
  if (
    user.planCode === "pro" &&
    user.planStatus === "active" &&
    user.planExpiresAt?.getTime() === planExpiresAt.getTime()
  ) {
    console.log("[applyPaidPeriodToUser] period already applied", { userId });
    return;
  }

  await updateUserPlan(userId, {
    planCode: "pro",
    planStatus: "active",
    planExpiresAt,
  });
  console.log("[applyPaidPeriodToUser] plan updated", {
    userId,
    planExpiresAt,
  });
  if (!shouldNotify) return;
  await sendSubscriptionConfirmed(
    userId,
    interval,
    planExpiresAt,
    user.timezone,
  );
}

export async function handleInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId = resolveInvoiceSubscriptionId(invoice);
  if (!subscriptionId) {
    console.log("[handleInvoicePaid] invoice without subscription, skipping", {
      invoiceId: invoice.id,
    });
    return;
  }

  const data = await buildSubscriptionData(subscriptionId);
  await upsertSubscriptionByPaymentSubscriptionId({
    ...data,
    amount: invoice.amount_paid,
  });

  if (!data.currentPeriodEnd) return;
  await applyPaidPeriodToUser(
    data.userId,
    data.interval,
    data.currentPeriodEnd,
    invoice.billing_reason === "subscription_create",
  );
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const subscriptionId = resolveInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await updateSubscriptionByPaymentSubscriptionId(subscriptionId, {
    status: subscription.status,
  });
  console.log("[handleInvoicePaymentFailed] status updated", {
    subscriptionId,
    status: subscription.status,
  });
}

// Cancelamento programado pelo Portal (e a reativação) chega aqui: só a linha
// registra a marcação; o acesso segue até o planExpiresAt já pago.
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
): Promise<void> {
  const cancelAtPeriodEnd = isCancelScheduled(subscription);
  await updateSubscriptionByPaymentSubscriptionId(subscription.id, {
    status: subscription.status,
    cancelAtPeriodEnd,
  });
  console.log("[handleSubscriptionUpdated] subscription updated", {
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd,
  });
}

// Cancelamento no fim do período (Portal) não toca no User: o acesso expira
// pela data já paga. Só o término antes do fim do período (cancelamento
// imediato pelo painel, em geral com reembolso) recalcula o acesso.
async function revokeUnusedPaidPeriod(
  subscription: Stripe.Subscription,
): Promise<void> {
  const [item] = subscription.items.data;
  const userId = subscription.metadata.userId;
  if (!item || !userId || !subscription.ended_at) return;

  const endedAt = new Date(subscription.ended_at * 1000);
  const periodEnd = new Date(item.current_period_end * 1000);
  if (!isEndedBeforePeriodEnd(endedAt, periodEnd)) return;

  const user = await findUserById(userId);
  if (!user) {
    throw new Error(`[revokeUnusedPaidPeriod] user not found: ${userId}`);
  }

  const planExpiresAt = resolveAccessAfterEarlyCancel(
    user.createdAt,
    endedAt,
    new Date(),
  );

  await updateUserPlan(userId, { planExpiresAt });
  console.log("[revokeUnusedPaidPeriod] access recalculated", {
    userId,
    planExpiresAt,
  });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const canceledAt = subscription.canceled_at ?? subscription.ended_at;
  await updateSubscriptionByPaymentSubscriptionId(subscription.id, {
    status: subscription.status,
    canceledAt: canceledAt ? new Date(canceledAt * 1000) : new Date(),
  });
  console.log("[handleSubscriptionDeleted] subscription canceled", {
    subscriptionId: subscription.id,
  });

  await revokeUnusedPaidPeriod(subscription);
}
