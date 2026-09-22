import { Message } from "../lib/prisma";
import { MESSAGES_PAGE_SIZE } from "../lib/constants";
import { findMessagesPage } from "../repo/messages.repo";
import { findCurrentActivityByUser } from "../repo/activities.repo";
import {
  countSm2EligibleQuestions,
  findFeedbackTranslationsByIds,
} from "../repo/questions.repo";

export async function findMessagesTimelinePage(
  userId: string,
  before?: string,
): Promise<{
  messages: Message[];
  hasMore: boolean;
  feedbackTranslations: Record<string, string>;
}> {
  const page = await findMessagesPage(userId, before, MESSAGES_PAGE_SIZE);
  const feedbackQuestionIds = Array.from(
    new Set(
      page
        .filter(
          (m) => m.role === "assistant" && m.mediaType === "audio" && m.questionId,
        )
        .map((m) => m.questionId as string),
    ),
  );
  const translations = feedbackQuestionIds.length
    ? await findFeedbackTranslationsByIds(feedbackQuestionIds)
    : [];
  const feedbackTranslations = Object.fromEntries(
    translations
      .filter((q) => q.feedbackTranslation)
      .map((q) => [q.id, q.feedbackTranslation as string]),
  );

  return {
    messages: page.slice().reverse(),
    hasMore: page.length === MESSAGES_PAGE_SIZE,
    feedbackTranslations,
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
