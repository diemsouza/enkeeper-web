import { Subscription } from "../lib/prisma";
import { prisma } from "../lib/prisma";
import { SubscriptionInterval } from "../lib/constants";

export type LatestSubscription = Pick<
  Subscription,
  | "paymentProvider"
  | "paymentCustomerId"
  | "paymentSubscriptionId"
  | "interval"
  | "status"
  | "cancelAtPeriodEnd"
  | "canceledAt"
>;

export type UpsertSubscriptionData = {
  userId: string;
  paymentProvider: string;
  paymentSubscriptionId: string;
  paymentCustomerId?: string | null;
  paymentMethod?: string | null;
  interval: SubscriptionInterval;
  amount: number;
  currency: string;
  status: string;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd: boolean;
};

export type UpdateSubscriptionData = Partial<
  Pick<
    Subscription,
    | "paymentMethod"
    | "amount"
    | "status"
    | "currentPeriodEnd"
    | "cancelAtPeriodEnd"
    | "canceledAt"
  >
>;

export async function findLatestSubscriptionByUser(
  userId: string,
): Promise<LatestSubscription | null> {
  return prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      paymentProvider: true,
      paymentCustomerId: true,
      paymentSubscriptionId: true,
      interval: true,
      status: true,
      cancelAtPeriodEnd: true,
      canceledAt: true,
    },
  });
}

export async function upsertSubscriptionByPaymentSubscriptionId(
  data: UpsertSubscriptionData,
): Promise<void> {
  const { userId, paymentProvider, paymentSubscriptionId, ...rest } = data;
  await prisma.subscription.upsert({
    where: { paymentSubscriptionId },
    create: { userId, paymentProvider, paymentSubscriptionId, ...rest },
    update: rest,
  });
}

export async function updateSubscriptionByPaymentSubscriptionId(
  paymentSubscriptionId: string,
  data: UpdateSubscriptionData,
): Promise<void> {
  await prisma.subscription.updateMany({
    where: { paymentSubscriptionId },
    data,
  });
}
