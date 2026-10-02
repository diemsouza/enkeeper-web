import {
  findEligibleActivities,
  updateActivity,
} from "../repo/activities.repo";
import {
  findDocById,
  findPendingDocByUser,
  updateDoc,
} from "../repo/docs.repo";
import {
  findNextUnansweredQuestion,
  // findNextGeneralQuestion: só usado por selectNextQuestion, pausado com a
  // cadência normal (§8). TODO: review
  // findNextGeneralQuestion,
  findSm2EligibleQuestion,
  updateQuestion,
  createQuestions,
  findQuestionById,
  countQuestionFormatsByActivity,
  findLatestUnansweredQuestion,
  CreateQuestionData,
} from "../repo/questions.repo";
import {
  findUserChannelByUserId,
  findUserById,
  findUsersWithExpiredFlowIntent,
  updateUserPendingIntent,
} from "../repo/users.repo";
import { MessageChannel, TypingTarget } from "../types/message-channel";
import { sendAndSaveMessage, waitBeforeSend } from "./message-sender-service";
import {
  formatQuestion,
  formatActivityStart,
  formatNewActivityFlowExpired,
} from "../core/formatters";
import { canPractice } from "../core/access";
import {
  DOC_PROCESSING_TIMEOUT_MS,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
  DOC_PENDING_TIMEOUT_MS,
  COMMAND_TIMEOUT_MIN,
  DEFAULT_MESSAGE_INTERVAL_SEC,
} from "../lib/constants";
import { Activity, Question, QuestionFormat } from "../lib/prisma";
import { splitContentIntoBlocks } from "../core/pool-size";
import { FormatCounts, pickNextFormat } from "../core/question-format-picker";
import { generateNextQuestion } from "../vendors/llm.vendor";
import { SectionQuestionResult } from "../lib/llm-schemas";
import {
  getQuestionExamples,
  validateGeneratedQuestion,
  sanitizeQuestionData,
} from "../core/format-loader";
import { startOfDay } from "date-fns";
import { ulid } from "ulid";
import { storeQuestionImage } from "./question-image-service";
import { buildRoundCompletedSummary } from "./activity-service";
import { UserIntentMetadata } from "../types/domain";

const IMAGE_QUESTION_ROLLOUT_FRACTION = parseFloat(
  process.env.IMAGE_QUESTION_ROLLOUT_FRACTION ?? "0",
);

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

      // Cadência normal (Product-Rules §8) pausada: prática migrou para o web e
      // o disparo/frequência do lado web ainda não existe. Bloco original
      // comentado abaixo para reativar. TODO: review
      //
      // if (activity.waitingUser) {
      //   skipped++;
      //   continue;
      // }
      //
      // const userChannel = await findUserChannelByUserId(activity.userId);
      // if (!userChannel) {
      //   skipped++;
      //   continue;
      // }
      //
      // const today = startOfDay(new Date());
      //
      // const question = await selectNextQuestion(
      //   activity,
      //   today,
      //   userChannel.channelUserId,
      //   userChannel.id,
      //   channel,
      // );
      // if (!question) {
      //   skipped++;
      //   continue;
      // }
      //
      // await sendCadenceQuestion(
      //   question,
      //   activity,
      //   userChannel,
      //   today,
      //   channel,
      // );
      //
      // processed++;
      skipped++;
      continue;
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
    questionImageMediaId: string | null;
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

  const questionText = formatQuestion(question, { level: activity.userLevel });

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
  replyToMessageId?: string,
): Promise<boolean> {
  try {
    await channel.notifyTyping(activity.userId, { replyToMessageId });
    const outcome = await generateQuestionIfPoolNotFull(activity, {
      channel,
      replyToMessageId,
    });
    if (outcome.poolExhausted || !outcome.question) return false;

    await waitBeforeSend(
      channel,
      activity.userId,
      DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
      { replyToMessageId },
    );
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

  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let cursorId: string | null = null;

  for (;;) {
    const users = await findUsersWithExpiredFlowIntent(cursorId, threshold, 500);
    if (users.length === 0) break;

    for (const user of users) {
      try {
        if (
          user.pendingIntent === "waiting_set_level" &&
          !isNewActivityFlowIntent(user)
        ) {
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

    cursorId = users[users.length - 1].id;
    if (users.length < 500) break;
  }

  return { processed, skipped, errors };
}

// selectNextQuestion: só era usada pelo ramo de envio de pergunta da cadência
// normal (§8), pausado em processActivityCron. TODO: review
// async function selectNextQuestion(
//   activity: Activity,
//   today: Date,
//   channelId: string,
//   userChannelId: string,
//   channel: MessageChannel,
// ): Promise<{
//   id: string;
//   question: string;
//   status: QuestionStatus | null;
//   questionFormat: QuestionFormat | null;
//   questionOptions: string[];
//   termHint: string | null;
// } | null> {
//   const lastId = activity.lastQuestionId;
//
//   if (!activity.roundCompleted) {
//     const sm2 = await findSm2EligibleQuestion(activity.id, lastId);
//     if (sm2) return sm2;
//
//     const unanswered = await findNextUnansweredQuestion(activity.docId, lastId);
//     if (unanswered) return unanswered;
//
//     const outcome = await generateQuestionIfPoolNotFull(activity);
//     if (!outcome.poolExhausted) {
//       if (outcome.question) return outcome.question;
//       return null;
//     }
//
//     await completeRoundZero(
//       activity.id,
//       activity.userId,
//       today,
//       userChannelId,
//       activity.intervalMinutes,
//       channel,
//       channelId,
//     );
//   }
//
//   return findNextGeneralQuestion(activity.id, lastId);
// }

type QuestionGenBaseParams = Omit<
  Parameters<typeof generateNextQuestion>[0],
  "format" | "questionExamples" | "retryContext"
>;

type ImageQuestionOutcome =
  | { status: "success"; data: CreateQuestionData }
  | { status: "fallback"; reason: string };

async function generateValidatedQuestion(
  format: QuestionFormat,
  baseParams: QuestionGenBaseParams,
): Promise<SectionQuestionResult | null> {
  const genParams = {
    ...baseParams,
    format,
    questionExamples: getQuestionExamples([format], baseParams.level),
    retryContext: undefined as string | undefined,
  };

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const generated = await generateNextQuestion(genParams);
    if (!generated) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      continue;
    }

    genParams.retryContext = validateGeneratedQuestion(generated, "vocabulary");
    if (!genParams.retryContext) return generated;
  }

  return null;
}

async function buildImageRecognitionQuestion(
  baseParams: QuestionGenBaseParams,
  typing?: TypingTarget,
): Promise<ImageQuestionOutcome> {
  const generated = await generateValidatedQuestion(
    QuestionFormat.image_recognition,
    baseParams,
  );
  if (!generated) {
    return { status: "fallback", reason: "question_generation_failed" };
  }
  if (generated.imageable !== true) {
    return { status: "fallback", reason: "not_imageable" };
  }
  const description = generated.questionImageDescription?.trim();
  if (!description) {
    return { status: "fallback", reason: "missing_image_description" };
  }

  const questionId = ulid();
  // Texto + imagem pode passar dos 25s do indicador: renova antes da imagem.
  if (typing) {
    await typing.channel.notifyTyping(baseParams.userId, {
      replyToMessageId: typing.replyToMessageId,
    });
  }
  const image = await storeQuestionImage({
    questionId,
    description,
    userId: baseParams.userId,
    docId: baseParams.docId,
  });
  if (image.status === "error") {
    return { status: "fallback", reason: image.reason };
  }

  return {
    status: "success",
    data: {
      ...sanitizeQuestionData(generated),
      id: questionId,
      questionImageMediaId: image.mediaId,
      questionImageDescription: description,
    },
  };
}

// image_recognition que falha (nao imageable, erro de geracao, vendor ou
// upload) cai em outro formato para o mesmo item, sem aviso ao usuario.
async function buildQuestionData(
  lastFormat: QuestionFormat | null,
  formatCounts: FormatCounts,
  baseParams: QuestionGenBaseParams,
  typing?: TypingTarget,
): Promise<CreateQuestionData | null> {
  const canUseImage = Math.random() < IMAGE_QUESTION_ROLLOUT_FRACTION;
  let format = pickNextFormat(lastFormat, { canUseImage, formatCounts });

  if (format === QuestionFormat.image_recognition) {
    const outcome = await buildImageRecognitionQuestion(baseParams, typing);
    if (outcome.status === "success") return outcome.data;
    console.warn(
      `[buildQuestionData] image_recognition fallback: ${outcome.reason}`,
    );
    format = pickNextFormat(lastFormat, { canUseImage: false, formatCounts });
    if (typing) {
    await typing.channel.notifyTyping(baseParams.userId, {
      replyToMessageId: typing.replyToMessageId,
    });
  }
  }

  const validated = await generateValidatedQuestion(format, baseParams);
  return validated ? sanitizeQuestionData(validated) : null;
}

export type GenerateOutcome =
  | { poolExhausted: true }
  | { poolExhausted: false; question: Question | null };

export async function generateQuestionIfPoolNotFull(
  activity: Activity,
  typing?: TypingTarget,
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

  const formatCounts = await countQuestionFormatsByActivity(
    activity.id,
    activity.userId,
  );
  const blocks = splitContentIntoBlocks(doc.content);
  const questionData = await buildQuestionData(
    lastFormat,
    formatCounts,
    {
      sectionType: "vocabulary",
      sectionTitle: doc.title ?? "",
      sectionContent: blocks[activity.questionCount % blocks.length],
      level: activity.userLevel,
      userId: activity.userId,
      docId: activity.docId,
    },
    typing,
  );

  if (!questionData) return { poolExhausted: false, question: null };

  await createQuestions(activity, [questionData]);

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
  replyToMessageId?: string,
): Promise<void> {
  await updateActivity(activityId, userId, {
    roundCompleted: true,
    waitingUser: false,
    nextMessageAt: new Date(Date.now() + intervalMinutes * 60 * 1000),
    lastQuestionId: null,
  });

  await channel.notifyTyping(userId, { replyToMessageId });
  const msg = await buildRoundCompletedSummary(activityId, userId);

  await sendAndSaveMessage({
    channel,
    to,
    userId,
    userChannelId,
    activityId,
    message: msg,
    intent: "practice_complete",
    today,
  });
}
