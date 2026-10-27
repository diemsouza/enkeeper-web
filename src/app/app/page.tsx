import { getTranslations } from "next-intl/server";
import { mapActivityMessages } from "@/src/components/chat/map-messages";
import { LiveThreadClient } from "@/src/components/app/live-thread-client";
import { PaymentSuccessToast } from "@/src/components/app/payment-success-toast";
import {
  PAYMENT_SESSION_PARAM,
  PAYMENT_SUCCESS_PARAM,
} from "@/src/lib/constants";
import { requireAuth } from "@/src/lib/auth/current-user";
import { hasPhonePrompted } from "@/src/core/phone-prompt";
import { findCurrentActivityByUser } from "@/src/repo/activities.repo";
import { findPaidPurchase } from "@/src/services/stripe-checkout-service";
import {
  findMessagesTimelinePage,
  findPendingReviewBanner,
} from "@/src/services/conversation-timeline-service";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const isPaymentSuccess = params[PAYMENT_SUCCESS_PARAM] === "success";
  const sessionId = params[PAYMENT_SESSION_PARAM];
  const purchase =
    isPaymentSuccess && sessionId
      ? await findPaidPurchase(user.id, sessionId)
      : null;
  const [
    { messages, hasMore, feedbackTranslations },
    pendingReviewBanner,
    currentActivity,
  ] = await Promise.all([
    findMessagesTimelinePage(user.id),
    findPendingReviewBanner(user.id),
    findCurrentActivityByUser(user.id),
  ]);
  const t = await getTranslations("app.chat");
  const mapped = mapActivityMessages(
    messages,
    {
      image: t("file_type_image"),
      pdf: t("file_type_pdf"),
      text: t("file_type_text"),
      generic: t("file_type_generic"),
    },
    feedbackTranslations,
  );

  return (
    <>
      {isPaymentSuccess && <PaymentSuccessToast purchase={purchase} />}
      <LiveThreadClient
        userId={user.id}
        currentActivityId={currentActivity?.id ?? null}
        initialMessages={mapped}
        initialHasMoreOlder={hasMore}
        needsAutoStart={mapped.length === 0}
        pendingReviewCount={pendingReviewBanner.count}
        showPendingReviewBanner={pendingReviewBanner.visible}
        shouldPromptPhone={!user.phone && !hasPhonePrompted(user.metadata)}
      />
    </>
  );
}
