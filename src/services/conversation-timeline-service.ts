import { Message } from "../lib/prisma";
import { MESSAGES_PAGE_SIZE } from "../lib/constants";
import { findMessagesPage } from "../repo/messages.repo";
import { findCurrentActivityByUser } from "../repo/activities.repo";
import { countSm2EligibleQuestions } from "../repo/questions.repo";

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

export async function findPendingReviewBanner(
  userId: string,
): Promise<{ count: number; visible: boolean }> {
  const activity = await findCurrentActivityByUser(userId);
  if (!activity) return { count: 0, visible: false };

  const count = await countSm2EligibleQuestions(activity.id);
  const isIntensiveMode = Boolean(
    activity.intensiveUntil && activity.intensiveUntil > new Date(),
  );
  return { count, visible: count > 0 && !isIntensiveMode };
}
