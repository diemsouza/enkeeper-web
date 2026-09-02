import {
  findCurrentActivityByUser,
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
  updateQuestion,
  createQuestions,
  findQuestionById,
  findLatestUnansweredQuestion,
} from "../repo/questions.repo";
import {
  findUserChannelByUserId,
  findUserById,
  findUsersWithExpiredFlowIntent,
  updateUserPendingIntent,
} from "../repo/users.repo";
import { incrementAgentMessageCount } from "../repo/daily-usage.repo";
import { MessageChannel } from "../types/message-channel";
import { sendAndSaveMessage } from "./message-sender-service";
import {
  formatNudgeMessage,
  formatQuestion,
  formatActivityStart,
  formatNewActivityFlowExpired,
} from "../core/formatters";
import { canPractice } from "../core/access";
import {
  DOC_PROCESSING_TIMEOUT_MS,
  NUDGE_THRESHOLDS_MS,
  getNextNudgeStep,
  getEntryNudgeStep,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
  DOC_PENDING_TIMEOUT_MS,
  COMMAND_TIMEOUT_MIN,
  DEFAULT_MESSAGE_INTERVAL_SEC,
} from "../lib/constants";
import { delay } from "../lib/utils";
import {
  Activity,
  Question,
  QuestionFormat,
  QuestionStatus,
} from "../lib/prisma";
import { splitContentIntoBlocks } from "../core/pool-size";
import { pickNextFormat } from "../core/question-format-picker";
import { generateNextQuestion } from "../vendors/llm.vendor";
import { SectionQuestionResult } from "../lib/llm-schemas";
import {
  getQuestionExamples,
  validateGeneratedQuestion,
  sanitizeQuestionData,
} from "../core/format-loader";
import { startOfDay } from "date-fns";
import { buildRoundCompletedSummary } from "./activity-service";
import { UserIntentMetadata } from "../types/domain";

function isNewActivityFlowIntent(user: { metadata: unknown }): boolean {
  const metadata = user.metadata as UserIntentMetadata | null;
  return metadata?.intent_data?.flow === "new_activity";
}

type CronResult = {
  processed: number;
  skipped: number;
  errors: number;
};

export async function processActivityCron(
  channel: MessageChannel,
): Promise<CronResult> {
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

      if (user.pendingIntent === "waiting_doc_replace") {
        skipped++;
        continue;
      }

      if (
        user.pendingIntent === "waiting_set_activity_domain" ||
        user.pendingIntent === "waiting_set_activity_topic" ||
        user.pendingIntent === "waiting_set_activity_focus" ||
        (user.pendingIntent === "waiting_set_level" &&
          isNewActivityFlowIntent(user))
      ) {
        skipped++;
        continue;
      }

      const pendingDoc = await findPendingDocByUser(activity.userId);
      if (pendingDoc) {
        const pendingAgeMs = Date.now() - pendingDoc.createdAt.getTime();
        if (pendingAgeMs > DOC_PENDING_TIMEOUT_MS) {
          await updateDoc(pendingDoc.id, activity.userId, {
            status: "failed",
            error: `Doc pending more than ${DOC_PENDING_TIMEOUT_MS} ms.`,
          });
          const userChannel = await findUserChannelByUserId(activity.userId);
          if (userChannel) {
            const msg =
              "Não consegui processar seu conteúdo. Tenta mandar de novo.";
            await sendAndSaveMessage({
              channel,
              to: userChannel.channelUserId,
              userId: activity.userId,
              userChannelId: userChannel.id,
              message: { text: msg },
              intent: "system_error",
              today: startOfDay(new Date()),
            });
          }
        }
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
          await updateDoc(doc.id, activity.userId, {
            status: "failed",
            error: `Doc processing more than ${DOC_PROCESSING_TIMEOUT_MS} ms.`,
          });
          const userChannel = await findUserChannelByUserId(activity.userId);
          if (userChannel) {
            const msg =
              "Não consegui processar seu conteúdo. Tenta mandar de novo.";
            await sendAndSaveMessage({
              channel,
              to: userChannel.channelUserId,
              userId: activity.userId,
              userChannelId: userChannel.id,
              message: { text: msg },
              intent: "system_error",
              today: startOfDay(new Date()),
            });
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
                referenceTime.getTime() + NUDGE_THRESHOLDS_MS.h12,
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

        let nudgeExternalId: string | null = null;
        try {
          const result = await channel.sendMessage(
            userChannel.channelUserId,
            nudge,
          );
          nudgeExternalId = result.externalId;
        } catch (err) {
          console.error(
            `[processActivityCron] nudge send error (${nextStep}):`,
            err,
          );
          errors++;
          continue;
        }

        await saveMessage({
          userId: activity.userId,
          userChannelId: userChannel.id,
          activityId: activity.id,
          role: "assistant",
          content: nudge.text,
          templateName: nudge.templateName,
          intent: "practice_nudge",
          externalId: nudgeExternalId ?? undefined,
        });
        await incrementAgentMessageCount(activity.userId, today);

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
        userChannel.channelUserId,
        userChannel.id,
        channel,
      );
      if (!question) {
        skipped++;
        continue;
      }

      await sendCadenceQuestion(
        question,
        activity,
        userChannel,
        today,
        channel,
      );

      processed++;
    } catch (err) {
      console.error(
        `[processActivityCron] activity ${activity.id} error:`,
        err,
      );
      errors++;
    }
  }

  return { processed, skipped, errors };
}

async function sendCadenceQuestion(
  question: {
    id: string;
    question: string;
    questionFormat: QuestionFormat | null;
    questionOptions: string[];
    termHint: string | null;
  },
  activity: Activity,
  userChannel: { channelUserId: string; id: string },
  today: Date,
  channel: MessageChannel,
): Promise<void> {
  if (activity.executionCount === 0) {
    const startMsg = formatActivityStart(activity.title);
    await sendAndSaveMessage({
      channel,
      to: userChannel.channelUserId,
      userId: activity.userId,
      userChannelId: userChannel.id,
      activityId: activity.id,
      message: startMsg,
      intent: "activity_start",
      today,
    });
  }

  const questionText = formatQuestion(question);

  await sendAndSaveMessage({
    channel,
    to: userChannel.channelUserId,
    userId: activity.userId,
    userChannelId: userChannel.id,
    activityId: activity.id,
    message: questionText,
    intent: "practice_question",
    questionId: question.id,
    today,
  });
  await updateQuestion(question.id, {
    status: "pending",
    activityId: activity.id,
  });
  await updateActivity(activity.id, activity.userId, {
    executionCount: activity.executionCount + 1,
    nextMessageAt: new Date(Date.now() + activity.intervalMinutes * 60 * 1000),
    waitingUser: true,
    lastQuestionId: question.id,
  });
}

export async function sendFirstQuestionNow(
  activity: Activity,
  userChannel: { channelUserId: string; id: string },
  today: Date,
  channel: MessageChannel,
): Promise<boolean> {
  try {
    const outcome = await generateQuestionIfPoolNotFull(activity);
    if (outcome.poolExhausted || !outcome.question) return false;

    await delay(DEFAULT_MESSAGE_INTERVAL_SEC);
    await sendCadenceQuestion(
      outcome.question,
      activity,
      userChannel,
      today,
      channel,
    );
    return true;
  } catch (err) {
    console.error(
      `[sendFirstQuestionNow] activity ${activity.id} failed:`,
      err,
    );
    return false;
  }
}

export async function processExpiredFlowIntents(
  channel: MessageChannel,
): Promise<CronResult> {
  const threshold = new Date(Date.now() - COMMAND_TIMEOUT_MIN * 60 * 1000);
  const users = await findUsersWithExpiredFlowIntent(threshold);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      if (
        user.pendingIntent === "waiting_set_level" &&
        !isNewActivityFlowIntent(user)
      ) {
        skipped++;
        continue;
      }

      const currentActivity = await findCurrentActivityByUser(user.id);
      if (!currentActivity) {
        skipped++;
        continue;
      }

      await updateUserPendingIntent(user.id, null);

      const userChannel = await findUserChannelByUserId(user.id);
      if (userChannel) {
        const msg = formatNewActivityFlowExpired();
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: msg,
          today: startOfDay(new Date()),
        });
      }

      processed++;
    } catch (err) {
      console.error(
        `[processExpiredFlowIntents] expired flow intent for user ${user.id}:`,
        err,
      );
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
  channel: MessageChannel,
): Promise<{
  id: string;
  question: string;
  status: QuestionStatus | null;
  questionFormat: QuestionFormat | null;
  questionOptions: string[];
  termHint: string | null;
} | null> {
  const lastId = activity.lastQuestionId;

  if (!activity.roundCompleted) {
    const sm2 = await findSm2EligibleQuestion(activity.id, lastId);
    if (sm2) return sm2;

    const unanswered = await findNextUnansweredQuestion(activity.docId, lastId);
    if (unanswered) return unanswered;

    const outcome = await generateQuestionIfPoolNotFull(activity);
    if (!outcome.poolExhausted) {
      if (outcome.question) return outcome.question;
      return null;
    }

    await completeRoundZero(
      activity.id,
      activity.userId,
      today,
      userChannelId,
      activity.intervalMinutes,
      channel,
      channelId,
    );
  }

  return findNextGeneralQuestion(activity.id, lastId);
}

export type GenerateOutcome =
  | { poolExhausted: true }
  | { poolExhausted: false; question: Question | null };

export async function generateQuestionIfPoolNotFull(
  activity: Activity,
): Promise<GenerateOutcome> {
  if (
    activity.questionLimit > 0 &&
    activity.questionCount >= activity.questionLimit
  ) {
    return { poolExhausted: true };
  }

  const doc = await findDocById(activity.docId, activity.userId);
  if (!doc?.content) return { poolExhausted: true };

  let lastFormat: QuestionFormat | null = null;
  if (activity.lastQuestionId) {
    const lastQuestion = await findQuestionById(activity.lastQuestionId);
    lastFormat = lastQuestion?.questionFormat ?? null;
  }

  const format = pickNextFormat(lastFormat);
  const questionExamples = getQuestionExamples([format], activity.userLevel);

  const blocks = splitContentIntoBlocks(doc.content);
  const docContent = blocks[activity.questionCount % blocks.length];

  const genParams = {
    sectionType: "vocabulary" as const,
    sectionTitle: doc.title ?? "",
    sectionContent: docContent,
    level: activity.userLevel,
    format,
    questionExamples,
    userId: activity.userId,
    docId: activity.docId,
    retryContext: undefined as string | undefined,
  };

  let validated: SectionQuestionResult | null = null;

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const generated = await generateNextQuestion(genParams);
    if (!generated) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      continue;
    }

    genParams.retryContext = validateGeneratedQuestion(generated, "vocabulary");
    if (!genParams.retryContext) {
      validated = generated;
      break;
    }
  }

  if (!validated) return { poolExhausted: false, question: null };

  await createQuestions(activity.id, [sanitizeQuestionData(validated)]);

  await updateActivity(activity.id, activity.userId, {
    questionCount: activity.questionCount + 1,
  });

  return {
    poolExhausted: false,
    question: await findLatestUnansweredQuestion(activity.id),
  };
}

export async function isRoundPoolExhausted(
  activity: Activity,
): Promise<boolean> {
  const sm2 = await findSm2EligibleQuestion(
    activity.id,
    activity.lastQuestionId,
  );
  if (sm2) return false;

  const unanswered = await findNextUnansweredQuestion(
    activity.docId,
    activity.lastQuestionId,
  );
  if (unanswered) return false;

  if (
    activity.questionLimit > 0 &&
    activity.questionCount >= activity.questionLimit
  ) {
    return true;
  }

  const doc = await findDocById(activity.docId, activity.userId);
  return !doc?.content;
}

export async function completeRoundZero(
  activityId: string,
  userId: string,
  today: Date,
  userChannelId: string,
  intervalMinutes: number,
  channel: MessageChannel,
  to: string,
): Promise<void> {
  await updateActivity(activityId, userId, {
    roundCompleted: true,
    waitingUser: false,
    nextMessageAt: new Date(Date.now() + intervalMinutes * 60 * 1000),
    lastQuestionId: null,
  });

  const msg = await buildRoundCompletedSummary(activityId);

  await sendAndSaveMessage({
    channel,
    to,
    userId,
    userChannelId,
    activityId,
    message: msg,
    mediaType: msg.imagePath ? "image" : undefined,
    mediaId: msg.imagePath,
    intent: "practice_complete",
    today,
  });
}
