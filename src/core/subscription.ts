import {
  PAYMENT_GRACE_DAYS,
  PAYMENT_PROVIDER,
  SUBSCRIPTION_INTERVAL,
  SUBSCRIPTION_STATUS_CANCELED,
  SubscriptionInterval,
  TRIAL_DAYS,
} from "../lib/constants";

type SubscriptionPaymentRef = {
  paymentProvider: string;
  paymentSubscriptionId: string | null;
  status: string;
  canceledAt: Date | null;
};

export function canManageSubscription(
  subscription: SubscriptionPaymentRef | null,
): boolean {
  return Boolean(
    subscription?.paymentProvider === PAYMENT_PROVIDER.STRIPE &&
    subscription.paymentSubscriptionId,
  );
}

export function hasOpenStripeSubscription(
  subscription: SubscriptionPaymentRef | null,
): boolean {
  return (
    canManageSubscription(subscription) &&
    subscription?.canceledAt === null &&
    subscription.status !== SUBSCRIPTION_STATUS_CANCELED
  );
}

export function resolveSubscriptionInterval(
  recurringInterval: string,
): SubscriptionInterval {
  return recurringInterval === "year"
    ? SUBSCRIPTION_INTERVAL.YEARLY
    : SUBSCRIPTION_INTERVAL.MONTHLY;
}

export function resolvePaymentMethod(paymentMethod: {
  type: string;
  card?: { funding: string } | null;
}): string {
  if (paymentMethod.type === "card" && paymentMethod.card) {
    return `card_${paymentMethod.card.funding}`;
  }
  return paymentMethod.type;
}

export function resolveOpenSubscriptionInterval(
  subscription: (SubscriptionPaymentRef & { interval: string }) | null,
): SubscriptionInterval | null {
  if (!subscription || !hasOpenStripeSubscription(subscription)) return null;
  return subscription.interval === SUBSCRIPTION_INTERVAL.YEARLY
    ? SUBSCRIPTION_INTERVAL.YEARLY
    : SUBSCRIPTION_INTERVAL.MONTHLY;
}

export function isEndedBeforePeriodEnd(
  endedAt: Date,
  currentPeriodEnd: Date,
): boolean {
  return endedAt.getTime() < currentPeriodEnd.getTime();
}

// Cancelamento imediato: ainda no trial, o acesso volta ao fim do trial
// original (quem assinou durante o teste não perde os dias grátis); com o trial
// já encerrado, o acesso termina no momento do cancelamento.
export function resolveAccessAfterEarlyCancel(
  userCreatedAt: Date,
  canceledAt: Date,
  now: Date,
): Date {
  const trialEnd = new Date(
    userCreatedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
  );
  return now < trialEnd ? trialEnd : canceledAt;
}

export function resolvePaidAccessEnd(currentPeriodEnd: Date): Date {
  return new Date(
    currentPeriodEnd.getTime() + PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000,
  );
}

export function isCancelScheduled(subscription: {
  cancel_at_period_end: boolean;
  cancel_at: number | null;
}): boolean {
  return subscription.cancel_at_period_end || subscription.cancel_at !== null;
}
