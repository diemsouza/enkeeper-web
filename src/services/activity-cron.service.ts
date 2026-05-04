import {
  findEligibleActivities,
  updateActivity,
  createActivity,
} from "../repo/activities.repo";
import { findDocById, updateDoc } from "../repo/docs.repo";
import {
  saveMessage,
  findLastActivityMessage,
} from "../repo/messages.repo";
import {
  findNextQuestion,
  updateQuestion,
  allQuestionsRight,
} from "../repo/questions.repo";
import { findUserChannelByUserId, findUserById } from "../repo/users.repo";
import { incrementAgentMessageCount } from "../repo/daily-usage.repo";
import { sendWhatsAppMessage } from "../vendors/whatsapp.vendor";
import { formatPracticeNudge, formatPracticeComplete } from "../core/formatters";
import { canPractice } from "../core/access";
import {
  NEXT_MESSAGE_INTERVAL_MIN,
  DOC_PROCESSING_TIMEOUT_MS,
} from "../lib/constants";

type CronResult = {
  processed: number;
  skipped: number;
  errors: number;
};

export async function processActivityCron(): Promise<CronResult> {
  const activities = await findEligibleActivities(100);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const activity of activities) {
    try {
      const user = await findUserById(activity.userId);
      if (!user || !canPractice(user)) {
        skipped++;
        continue;
      }

      const doc = await findDocById(activity.docId, activity.userId);
      if (!doc) {
        skipped++;
        continue;
      }

      if (doc.status === "processing") {
        const ageMs = Date.now() - doc.createdAt.getTime();
        if (ageMs > DOC_PROCESSING_TIMEOUT_MS) {
          await updateDoc(doc.id, activity.userId, { status: "failed" });
          const userChannel = await findUserChannelByUserId(activity.userId);
          if (userChannel) {
            const msg =
              "Não consegui processar seu conteúdo. Tenta mandar de novo.";
            await sendWhatsAppMessage(userChannel.channelId, msg);
            await saveMessage({
              userId: activity.userId,
              userChannelId: userChannel.id,
              role: "assistant",
              content: msg,
              intent: "system_error",
            });
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            await incrementAgentMessageCount(activity.userId, today);
          }
        }
        skipped++;
        continue;
      }

      const ACTIVITY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
      if (Date.now() - activity.createdAt.getTime() > ACTIVITY_MAX_AGE_MS) {
        await updateActivity(activity.id, activity.userId, {
          status: "archived",
        });
        const now = new Date();
        const intervalMinutes = NEXT_MESSAGE_INTERVAL_MIN;
        const nextMessageAt = new Date(
          now.getTime() + intervalMinutes * 60 * 1000,
        );
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        try {
          await createActivity({
            userId: activity.userId,
            docId: activity.docId,
            date,
            nextMessageAt,
            intervalMinutes,
            status: "active",
            approach: activity.approach,
            approachConfidence: activity.approachConfidence,
            approachOverride: activity.approachOverride ?? undefined,
          });
        } catch (err: unknown) {
          const isPrismaUnique =
            err instanceof Error &&
            "code" in err &&
            (err as { code: string }).code === "P2002";
          if (!isPrismaUnique) throw err;
        }
        skipped++;
        continue;
      }

      // Nudge: timer expirou e usuário ainda não respondeu
      const lastMsg = await findLastActivityMessage(activity.id);
      if (
        lastMsg?.role === "assistant" &&
        lastMsg.intent === "practice_question"
      ) {
        const userChannel = await findUserChannelByUserId(activity.userId);
        if (!userChannel) {
          skipped++;
          continue;
        }
        const nudge = formatPracticeNudge();
        await sendWhatsAppMessage(userChannel.channelId, nudge);
        await saveMessage({
          userId: activity.userId,
          userChannelId: userChannel.id,
          activityId: activity.id,
          role: "assistant",
          content: nudge,
          intent: "practice_nudge",
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await incrementAgentMessageCount(activity.userId, today);
        await updateActivity(activity.id, activity.userId, {
          waitingUser: true,
          nextMessageAt: new Date(
            Date.now() + activity.intervalMinutes * 60 * 1000,
          ),
        });
        processed++;
        continue;
      }

      if (activity.waitingUser) {
        skipped++;
        continue;
      }

      const done = await allQuestionsRight(activity.docId);
      if (done) {
        const lastMsg = await findLastActivityMessage(activity.id);
        const userChannel = await findUserChannelByUserId(activity.userId);
        if (userChannel && lastMsg?.intent !== "practice_complete") {
          const msg = formatPracticeComplete();
          await sendWhatsAppMessage(userChannel.channelId, msg);
          await saveMessage({
            userId: activity.userId,
            userChannelId: userChannel.id,
            activityId: activity.id,
            role: "assistant",
            content: msg,
            intent: "practice_complete",
          });
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          await incrementAgentMessageCount(activity.userId, today);
          processed++;
        } else {
          skipped++;
        }
        await updateActivity(activity.id, activity.userId, {
          nextMessageAt: null,
          waitingUser: false,
          intensiveUntil: null,
        });
        continue;
      }

      const question = await findNextQuestion(activity.docId);
      if (!question) {
        skipped++;
        continue;
      }

      const userChannel = await findUserChannelByUserId(activity.userId);
      if (!userChannel) {
        skipped++;
        continue;
      }

      await sendWhatsAppMessage(userChannel.channelId, question.question);

      await saveMessage({
        userId: activity.userId,
        userChannelId: userChannel.id,
        activityId: activity.id,
        role: "assistant",
        content: question.question,
        intent: "practice_question",
        questionId: question.id,
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await incrementAgentMessageCount(activity.userId, today);

      await updateQuestion(question.id, {
        status: "pending",
        activityId: activity.id,
      });

      await updateActivity(activity.id, activity.userId, {
        executionCount: activity.executionCount + 1,
        nextMessageAt: new Date(
          Date.now() + activity.intervalMinutes * 60 * 1000,
        ),
        waitingUser: true,
      });

      processed++;
    } catch (err) {
      console.error(`[activity-cron] activity ${activity.id} error:`, err);
      errors++;
    }
  }

  return { processed, skipped, errors };
}
