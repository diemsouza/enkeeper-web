import { mapActivityMessages } from "@/src/components/chat/map-messages";
import { LiveThreadClient } from "@/src/components/app/live-thread-client";
import { requireAuth } from "@/src/lib/auth/current-user";
import { findMessagesTimelinePage } from "@/src/services/conversation-timeline-service";

export default async function AppPage() {
  const user = await requireAuth();
  const { messages, hasMore } = await findMessagesTimelinePage(user.id);
  const mapped = mapActivityMessages(messages);

  return (
    <LiveThreadClient
      userId={user.id}
      initialMessages={mapped}
      initialHasMoreOlder={hasMore}
      needsAutoStart={mapped.length === 0}
    />
  );
}
