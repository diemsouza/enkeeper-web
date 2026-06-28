import {
  findEligibleActivities,
  updateActivity,
} from "../repo/activities.repo";
import {
  findDocById,
  findPendingDocByUser,
  updateDoc,
} from "../repo/docs.repo";
import { saveMessage, findLastActivityMessage } from "../repo/messages.repo";
import {
  findNextUnansweredQuestion,
  findNextGeneralQuestion,
  findSm2EligibleQuestion,
  hasWrongOrPartial,
  updateQuestion,
} from "../repo/questions.repo";
import { findUserChannelByUserId, findUserById } from "../repo/users.repo";
import { incrementAgentMessageCount } from "../repo/daily-usage.repo";
import {
  sendWhatsAppMessage,
  sendWhatsAppTemplate,
} from "../vendors/whatsapp.vendor";
import {
  formatChoiceQuestion,
  formatNudgeMessage,
  formatPracticeComplete,
  formatSectionTransition,
} from "../core/formatters";
import { findSectionById } from "../repo/sections.repo";
import { canPractice } from "../core/access";
import {
  DOC_PROCESSING_TIMEOUT_MS,
  NUDGE_THRESHOLDS_MS,
  getNextNudgeStep,
  getEntryNudgeStep,
} from "../lib/constants";
import { Activity, QuestionFormat, QuestionStatus } from "../lib/prisma";
import { startOfDay } from "date-fns";

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

      if (
        user.pendingIntent === "awaiting_doc_replace" ||
        user.pendingIntent === "awaiting_doc_confirm"
      ) {
        skipped++;
        continue;
      }

      const pendingDoc = await findPendingDocByUser(activity.userId);
      if (pendingDoc) {
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
            const today = startOfDay(new Date());
            await incrementAgentMessageCount(activity.userId, today);
          }
        }
        skipped++;
        continue;
      }

      if (activity.intensiveUntil && activity.intensiveUntil > new Date()) {
        skipped++;
        continue;
      }

      const lastMsg = await findLastActivityMessage(activity.id);

      if (
        lastMsg?.role === "assistant" &&
        (lastMsg.intent === "practice_question" ||
          lastMsg.intent === "practice_nudge")
      ) {
        const userChannel = await findUserChannelByUserId(activity.userId);
        if (!userChannel) {
          skipped++;
          continue;
        }

        const referenceTime = activity.lastInteractionAt ?? activity.createdAt;
        const elapsedMs = Date.now() - referenceTime.getTime();

        let nextStep;
        if (activity.lastNudgeStep === null) {
          const entryStep = getEntryNudgeStep(elapsedMs);
          if (!entryStep) {
            await updateActivity(activity.id, activity.userId, {
              nextMessageAt: new Date(
                referenceTime.getTime() + NUDGE_THRESHOLDS_MS.h3,
              ),
            });
            skipped++;
            continue;
          }
          nextStep = entryStep;
        } else {
          const candidate = getNextNudgeStep(activity.lastNudgeStep);
          if (!candidate) {
            await updateActivity(activity.id, activity.userId, {
              nextMessageAt: null,
            });
            skipped++;
            continue;
          }
          if (elapsedMs < NUDGE_THRESHOLDS_MS[candidate]) {
            await updateActivity(activity.id, activity.userId, {
              nextMessageAt: new Date(
                referenceTime.getTime() + NUDGE_THRESHOLDS_MS[candidate],
              ),
            });
            skipped++;
            continue;
          }
          nextStep = candidate;
        }

        const today = startOfDay(new Date());
        const nudge = formatNudgeMessage(nextStep);

        try {
          if (nudge.templateName) {
            await sendWhatsAppTemplate(
              userChannel.channelId,
              nudge.templateName,
            );
          } else {
            await sendWhatsAppMessage(userChannel.channelId, nudge.text);
          }
        } catch (err) {
          console.error(`[activity-cron] nudge send error (${nextStep}):`, err);
          errors++;
          continue;
        }

        await saveMessage({
          userId: activity.userId,
          userChannelId: userChannel.id,
          activityId: activity.id,
          role: "assistant",
          content: nudge.text,
          intent: "practice_nudge",
        });
        await incrementAgentMessageCount(activity.userId, today);

        const nextAfterStep = getNextNudgeStep(nextStep);
        await updateActivity(activity.id, activity.userId, {
          lastNudgeStep: nextStep,
          lastNudgeAt: new Date(),
          waitingUser: true,
          nextMessageAt: nextAfterStep
            ? new Date(
                referenceTime.getTime() + NUDGE_THRESHOLDS_MS[nextAfterStep],
              )
            : null,
        });

        processed++;
        continue;
      }

      if (activity.waitingUser) {
        skipped++;
        continue;
      }

      const userChannel = await findUserChannelByUserId(activity.userId);
      if (!userChannel) {
        skipped++;
        continue;
      }

      const today = startOfDay(new Date());

      const question = await selectNextQuestion(
        activity,
        today,
        userChannel.channelId,
        userChannel.id,
      );
      if (!question) {
        skipped++;
        continue;
      }

      if (question.sectionId) {
        const section = await findSectionById(question.sectionId);
        if (section?.status === null) {
          const transitionMsg = formatSectionTransition(
            section.title,
            activity.executionCount === 0,
          );
          await sendWhatsAppMessage(userChannel.channelId, transitionMsg);
          await saveMessage({
            userId: activity.userId,
            userChannelId: userChannel.id,
            activityId: activity.id,
            role: "assistant",
            content: transitionMsg,
            intent: "section_transition",
          });
          await incrementAgentMessageCount(activity.userId, today);
        }
      }

      const questionText =
        question.questionFormat === QuestionFormat.choice &&
        question.questionOptions.length > 0
          ? formatChoiceQuestion(question.question, question.questionOptions)
          : question.question;

      await sendWhatsAppMessage(userChannel.channelId, questionText);
      await saveMessage({
        userId: activity.userId,
        userChannelId: userChannel.id,
        activityId: activity.id,
        role: "assistant",
        content: questionText,
        intent: "practice_question",
        questionId: question.id,
      });
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
        lastQuestionId: question.id,
      });

      processed++;
    } catch (err) {
      console.error(`[activity-cron] activity ${activity.id} error:`, err);
      errors++;
    }
  }

  return { processed, skipped, errors };
}

async function selectNextQuestion(
  activity: Activity,
  today: Date,
  channelId: string,
  userChannelId: string,
): Promise<{
  id: string;
  question: string;
  status: QuestionStatus | null;
  sectionId: string | null;
  questionFormat: QuestionFormat | null;
  questionOptions: string[];
} | null> {
  const lastId = activity.lastQuestionId;

  if (!activity.roundCompleted) {
    const sm2 = await findSm2EligibleQuestion(activity.id, lastId);
    if (sm2) return sm2;

    const unanswered = await findNextUnansweredQuestion(activity.docId, lastId);
    if (unanswered) return unanswered;

    const openRemains = await hasWrongOrPartial(activity.docId);
    if (openRemains) {
      return findNextGeneralQuestion(activity.id, lastId);
    }

    const msg = await completeRoundZero(
      activity.id,
      activity.userId,
      today,
      userChannelId,
      activity.intervalMinutes,
    );
    await sendWhatsAppMessage(channelId, msg);
    return findNextGeneralQuestion(activity.id, lastId);
  }

  return findNextGeneralQuestion(activity.id, lastId);
}

export async function completeRoundZero(
  activityId: string,
  userId: string,
  today: Date,
  userChannelId: string,
  intervalMinutes: number,
): Promise<string> {
  await updateActivity(activityId, userId, {
    roundCompleted: true,
    intensiveUntil: null,
    waitingUser: false,
    nextMessageAt: new Date(Date.now() + intervalMinutes * 60 * 1000),
    lastQuestionId: null,
  });
  const msg = formatPracticeComplete();
  await saveMessage({
    userId: userId,
    userChannelId,
    activityId: activityId,
    role: "assistant",
    content: msg,
    intent: "practice_complete",
  });
  await incrementAgentMessageCount(userId, today);
  return msg;
}
