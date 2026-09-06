"use client";

import { ChatThread } from "@/src/components/chat/thread";
import type { Message } from "@/src/components/chat/types";

export function ArchivedActivityThreadClient({
  messages,
}: {
  messages: Message[];
}) {
  return <ChatThread messages={messages} showComposer={false} />;
}
