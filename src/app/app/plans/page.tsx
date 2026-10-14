import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlansCheckout } from "@/src/components/app/plans-checkout";
import { canPractice } from "@/src/core/access";
import { resolveOpenSubscriptionInterval } from "@/src/core/subscription";
import { requireAuth } from "@/src/lib/auth/current-user";
import { PAYMENT_PROVIDER } from "@/src/lib/constants";
import {
  formatDateInTimeZone,
  formatRelativeDay,
} from "@/src/lib/datetime-utils";
import { findLatestSubscriptionByUser } from "@/src/repo/subscriptions.repo";

export const metadata: Metadata = {
  title: "Fluizer | Planos",
  robots: "noindex",
};

export default async function PlansPage() {
  const user = await requireAuth();
  const [t, latestSubscription] = await Promise.all([
    getTranslations("pricing"),
    findLatestSubscriptionByUser(user.id),
  ]);

  const now = new Date();
  const currentInterval = resolveOpenSubscriptionInterval(latestSubscription);
  const canceledNote =
    currentInterval &&
    latestSubscription?.cancelAtPeriodEnd &&
    user.planExpiresAt
      ? t("canceled_note", {
          date: formatRelativeDay(user.planExpiresAt, now, user.timezone),
        })
      : null;
  const isPaidOutsideStripe =
    latestSubscription?.paymentProvider !== PAYMENT_PROVIDER.STRIPE;
  const manualAccessUntil =
    isPaidOutsideStripe && user.planCode === "pro" && canPractice(user)
      ? user.planExpiresAt
      : null;

  return (
    <div className="h-full overflow-y-auto px-4 py-10">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-[28px] font-normal leading-tight mb-2">
          {t("plans_title")}
        </h1>
        <p className="text-[15px] text-muted-foreground mb-8">
          {t("plans_subtitle")}
        </p>
        {manualAccessUntil && (
          <p className="mb-6 rounded-xl bg-muted px-4 py-3 text-sm">
            {t("manual_access_note", {
              date: formatDateInTimeZone(manualAccessUntil, user.timezone),
            })}
          </p>
        )}
        <PlansCheckout
          currentInterval={currentInterval}
          canceledNote={canceledNote}
        />
      </div>
    </div>
  );
}
