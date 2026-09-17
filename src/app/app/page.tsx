import { getTranslations } from "next-intl/server";
import { mapActivityMessages } from "@/src/components/chat/map-messages";
import { LiveThreadClient } from "@/src/components/app/live-thread-client";
import { requireAuth } from "@/src/lib/auth/current-user";
import {
  findMessagesTimelinePage,
  findPendingReviewBanner,
} from "@/src/services/conversation-timeline-service";

export default async function AppPage() {
  const user = await requireAuth();
  const [{ messages, hasMore }, pendingReviewBanner] = await Promise.all([
    findMessagesTimelinePage(user.id),
    findPendingReviewBanner(user.id),
  ]);
  const t = await getTranslations("app.chat");
  const mapped = mapActivityMessages(messages, {
    image: t("file_type_image"),
    pdf: t("file_type_pdf"),
    text: t("file_type_text"),
    generic: t("file_type_generic"),
  });

  return (
    <LiveThreadClient
      userId={user.id}
      initialMessages={mapped}
      initialHasMoreOlder={hasMore}
      needsAutoStart={mapped.length === 0}
      pendingReviewCount={pendingReviewBanner.count}
      showPendingReviewBanner={pendingReviewBanner.visible}
    />
  );
}
