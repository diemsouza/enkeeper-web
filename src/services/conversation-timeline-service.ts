import { Message } from "../lib/prisma";
import { MESSAGES_PAGE_SIZE } from "../lib/constants";
import { findMessagesPage } from "../repo/messages.repo";

export async function findMessagesTimelinePage(
  userId: string,
  before?: string,
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const page = await findMessagesPage(userId, before, MESSAGES_PAGE_SIZE);
  return {
    messages: page.slice().reverse(),
    hasMore: page.length === MESSAGES_PAGE_SIZE,
  };
}
