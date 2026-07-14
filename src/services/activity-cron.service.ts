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
  updateQuestion,
  countQuestionsForSection,
  createQuestions,
  findQuestionById,
  findLatestUnansweredInSection,
} from "../repo/questions.repo";
import { findUserChannelByUserId, findUserById } from "../repo/users.repo";
import { incrementAgentMessageCount } from "../repo/daily-usage.repo";
import { MessageChannel } from "../types/message-channel";
import {
  formatChoiceQuestion,
  formatNudgeMessage,
  formatQuestion,
  formatSectionTransition,
} from "../core/formatters";
import {
  findSectionById,
  getSectionsByActivityId,
} from "../repo/sections.repo";
import { canPractice } from "../core/access";
import {
  DOC_PROCESSING_TIMEOUT_MS,
  NUDGE_THRESHOLDS_MS,
  getNextNudgeStep,
  getEntryNudgeStep,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
} from "../lib/constants";
import {
  Activity,
  Question,
  QuestionFormat,
  QuestionStatus,
} from "../lib/prisma";
import { calculatePoolSize, splitContentIntoBlocks } from "../core/pool-size";
import { pickNextFormat } from "../core/question-format-picker";
import { generateNextQuestion } from "../vendors/llm.vendor";
import { SectionQuestionResult } from "../lib/llm-schemas";
import {
  getFormatsBySectionType,
  getQuestionExamples,
  validateGeneratedQuestion,
} from "../core/format-loader";
import { shuffle } from "lodash";
import { sanitizeText } from "../lib/utils";
import { startOfDay } from "date-fns";
import { RetryContext } from "../types/retry-context";
import { buildRoundCompletedSummary } from "./activity-service";

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
            await channel.sendMessage(userChannel.channelId, msg);
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
                referenceTime.getTime() + NUDGE_THRESHOLDS_MS.h4,
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
            await channel.sendTemplate(
              userChannel.channelId,
              nudge.templateName,
            );
          } else {
            await channel.sendMessage(userChannel.channelId, nudge.text);
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
        channel,
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
          await channel.sendMessage(userChannel.channelId, transitionMsg);
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

      await channel.sendMessage(userChannel.channelId, questionText);
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
  channel: MessageChannel,
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

    const outcome = await generateQuestionIfPoolNotFull(activity);
    if (!outcome.poolExhausted) {
      if (outcome.question) return outcome.question;
      return null;
    }

    const msg = await completeRoundZero(
      activity.id,
      activity.userId,
      today,
      userChannelId,
      activity.intervalMinutes,
    );
    await channel.sendMessage(channelId, msg);
  }

  return findNextGeneralQuestion(activity.id, lastId);
}

const TEXT_FOCUS_CYCLE = [
  "comprehension",
  "rephrase",
  "production",
  "inference",
] as const;

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

  const sections = await getSectionsByActivityId(activity.id);

  let targetSection: (typeof sections)[number] | null = null;
  let sectionQuestionCount = 0;
  for (const section of sections) {
    const count = await countQuestionsForSection(section.id);
    const poolSize = calculatePoolSize(section);
    if (count < poolSize) {
      targetSection = section;
      sectionQuestionCount = count;
      break;
    }
  }

  if (!targetSection) return { poolExhausted: true };

  let lastFormat: QuestionFormat | null = null;
  if (activity.lastQuestionId) {
    const lastQuestion = await findQuestionById(activity.lastQuestionId);
    lastFormat = lastQuestion?.questionFormat ?? null;
  }

  const format =
    targetSection.sectionType === "vocabulary"
      ? pickNextFormat(lastFormat)
      : targetSection.sectionType === "text"
        ? QuestionFormat.open_text
        : QuestionFormat.open_question;

  const questionExamples = getQuestionExamples(
    targetSection.sectionType === "vocabulary"
      ? [format]
      : getFormatsBySectionType(targetSection.sectionType),
    activity.userLevel,
  );

  const blocks = splitContentIntoBlocks(targetSection.content);
  let sectionContent: string;
  let questionFocus: string | undefined;

  if (targetSection.sectionType === "text") {
    sectionContent = targetSection.content;
    questionFocus =
      TEXT_FOCUS_CYCLE[sectionQuestionCount % TEXT_FOCUS_CYCLE.length];
  } else {
    sectionContent = blocks[sectionQuestionCount % blocks.length];
  }

  const genParams = {
    sectionType: targetSection.sectionType,
    sectionTitle: targetSection.title,
    sectionContent,
    level: activity.userLevel,
    format,
    questionExamples,
    questionFocus,
    userId: activity.userId,
    docId: activity.docId,
    sectionId: targetSection.id,
    retryContext: undefined as string | undefined,
  };

  let validated: SectionQuestionResult | null = null;

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const generated = await generateNextQuestion(genParams);
    if (!generated) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      continue;
    }

    genParams.retryContext = validateGeneratedQuestion(
      generated,
      targetSection.sectionType,
    );
    if (genParams.retryContext) {
      continue;
    }
    validated = generated;
  }

  if (!validated) return { poolExhausted: false, question: null };

  await createQuestions(activity.id, targetSection.id, [
    formatQuestion(validated),
  ]);

  await updateActivity(activity.id, activity.userId, {
    questionCount: activity.questionCount + 1,
  });

  return {
    poolExhausted: false,
    question: await findLatestUnansweredInSection(targetSection.id),
  };
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
    waitingUser: false,
    nextMessageAt: new Date(Date.now() + intervalMinutes * 60 * 1000),
    lastQuestionId: null,
  });

  const msg = await buildRoundCompletedSummary(activityId);

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
