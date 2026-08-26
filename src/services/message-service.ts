import {
  Activity,
  DocType,
  EvalTipClass,
  Level,
  Message,
  QuestionFormat,
} from "../lib/prisma";
import { parseMessage } from "../core/parser";
import { canPractice } from "../core/access";
import {
  canStartActivity,
  canAddDocItem,
  canPracticeToday,
} from "../core/limits";
import {
  formatCommandList,
  formatActivitiesList,
  selectArchivedActivities,
  formatLevelQuestion,
  formatActivityReplacePrompt,
  formatPauseSuccess,
  formatNoPausableDocs,
  formatResumeSuccess,
  formatNoPausedDocs,
  formatPlanExpired,
  formatSupportRequest,
  formatSupportReceived,
  formatDailyActivityLimitReached,
  formatDocItemReceived,
  formatDocItemLimitReached,
  formatNoActivity,
  formatIntensiveModeActivated,
  formatFeedback,
  formatEvalTip,
  formatIntensiveModeStopped,
  formatGuideAfterFirstFeedback,
  formatCanceled,
  formatActivityReplaceCanceled,
  formatInvalidResumeIndex,
  formatNoActiveActivity,
  formatNoPendingAction,
  formatFeedbackFailed,
  formatPracticeWaiting,
  formatInternalSupportMessage,
  formatOnboardingMsg5,
  formatDailyPracticeLimitReached,
  formatIntensiveDailyLimitReached,
  formatOnboardingMsg1,
  formatOnboardingMsg2,
  formatOnboardingMsg3,
  formatOnboardingMsg4,
  formatDomainQuestion,
  formatNewActivityFlowCanceled,
  formatNewActivityFlowCanceledGuidance,
  formatSetFirstLevelCanceled,
  formatFirstNewActivityCanceled,
  formatFeedbackToSpeech,
  formatImageBlocked,
  formatImageUnreadable,
} from "../core/formatters";
import { saveMessage, findLastUserMessage } from "../repo/messages.repo";
import { createMedia } from "../repo/media.repo";
import {
  markUserOnboarded,
  updateUserPlanStatus,
  updateUserName,
  updateUserPendingIntent,
  updateUserLastRequest,
  updateUserLastResponse,
} from "../repo/users.repo";
import { processLevelResponse } from "./level-capture-service";
import {
  processDomainResponse,
  processTopicResponse,
  processFocusResponse,
} from "./new-activity-flow-service";
import { findOrCreateUserByChannel } from "./user-service";
import { getOrCreateCheckoutUrl } from "./stripe-checkout-service";
import {
  createDoc,
  findDocById,
  findPendingDocByUser,
  updateDoc,
} from "../repo/docs.repo";
import { createDocItem, countValidDocItemsByDoc } from "../repo/doc-items.repo";
import {
  findLastActivityByUser,
  findCurrentActivityByUser,
  findActivitiesForList,
  updateActivity,
  countAllActivitiesByUser,
} from "../repo/activities.repo";
import {
  maybeSendActivitySuggestion,
  switchToActivity,
} from "./activity-service";
import { resolveFeedbackAudioPath } from "./feedback-audio-service";
import { resolveAnswerAudioPath } from "./answer-audio-service";
import {
  getTodayActivityCount,
  getTodayUsage,
  incrementUserMessageCount,
  incrementAgentMessageCount,
  incrementDailyPracticeCount,
} from "../repo/daily-usage.repo";
import { publishDocMerge, publishDocProcessing } from "../lib/qstash";
import { sendWhatsAppMessage } from "../vendors/whatsapp.vendor";
import { generateAnswerEvaluation } from "../vendors/llm.vendor";
import { getFeedbackExamples } from "../core/format-loader";
import { calcSm2 } from "../core/sm2";
import {
  updateScoreMetadata,
  computeQuestionScore,
} from "../lib/activity-score";
import {
  findNextUnansweredQuestion,
  findNextGeneralQuestion,
  findPendingQuestion,
  updateQuestion,
  findSm2EligibleQuestion,
} from "../repo/questions.repo";
import {
  formatIntensivePendingQuestion,
  formatQuestion,
  formatActivityStart,
} from "../core/formatters";
import {
  INTENSIVE_UNTIL_MIN,
  MAX_ACTIVITIES_PER_DAY,
  AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC,
  MESSAGE_SUPPRESSION_SEC,
  ONBOARDING_MESSAGE_INTERVAL_SEC,
  DAILY_PRACTICE_LIMIT,
  DEFAULT_MESSAGE_INTERVAL_SEC,
  MEDIA_PARENT_TYPE,
} from "../lib/constants";
import { delay } from "../lib/utils";
import { sendAndSaveMessage } from "./message-sender-service";
import {
  IncomingMessage,
  MessageIntent,
  NewActivityIntentData,
  UserIntentMetadata,
} from "../types/domain";
import {
  completeRoundZero,
  generateQuestionIfPoolNotFull,
} from "./activity-cron.service";
import {
  handleAdminCommand,
  handleAdminPendingSendMessage,
} from "./admin-service";
import { resolveCommand } from "../lib/commands";
import { markWaitlistActive } from "../repo/waitlist.repo";
import { startOfDay } from "date-fns";
import { validateDocItemInput } from "./doc-item-service";
import { MessageChannel } from "../types/message-channel";
import { FormattedMessage } from "../types/out-message";

const OVERRIDING_INTENTS: MessageIntent[] = [
  "list_commands",
  "list_activities",
  "support",
  "pause_activity",
  "resume_activity",
  "unknown_command",
  "cancel",
  "practice_now",
  "pause_practice",
  "set_level",
  "new_activity",
];

export async function handleIncomingMessage(
  input: IncomingMessage,
  channel: MessageChannel,
): Promise<void> {
  const rawText = (input.text ?? "").trim();
  const { user, userChannel } = await findOrCreateUserByChannel(
    input.channelType,
    input.channelUserId,
    input.channelUserPhone,
    input.channelUsername,
    input.contactName ?? undefined,
  );

  const text = input.text ?? "";
  const today = startOfDay(new Date());
  const messageId = input.externalId ?? "";

  const isLocked =
    user.lastRequestAt != null &&
    (user.lastResponseAt == null || user.lastResponseAt < user.lastRequestAt) &&
    Date.now() - user.lastRequestAt.getTime() < MESSAGE_SUPPRESSION_SEC * 1000;

  if (isLocked) {
    await saveMessage({
      userId: user.id,
      userChannelId: userChannel.id,
      role: "user",
      content: rawText,
      intent: "ignored",
      externalId: input.externalId,
      metadata: { reason: "duplicate_within_window" },
      receivedAt: input.receivedAt,
    });
    return;
  }

  await updateUserLastRequest(user.id, messageId);

  try {
    const [firstWord] = rawText.split(/\s+/);
    if (resolveCommand(firstWord) === "admin") {
      if (input.channelUserPhone !== process.env.WA_SUPPORT) return;
      const reply = await handleAdminCommand(rawText, user.id, channel);
      await sendAndSaveMessage({
        channel,
        to: userChannel.channelUserId,
        userId: user.id,
        userChannelId: userChannel.id,
        message: { text: reply },
        today,
      });
      return;
    }

    if (
      user.pendingIntent === "waiting_admin_send_message" &&
      input.channelUserPhone === process.env.WA_SUPPORT
    ) {
      const reply = await handleAdminPendingSendMessage(user, channel, rawText);
      await sendAndSaveMessage({
        channel,
        to: userChannel.channelUserId,
        userId: user.id,
        userChannelId: userChannel.id,
        message: { text: reply },
        today,
      });
      return;
    }

    // Atualiza nome do usuário se veio pelo canal e ainda não está salvo
    if (!user.name && input.contactName) {
      await updateUserName(user.id, input.contactName);
    }

    // ─── Verificação de acesso ────────────────────────────────────────────────
    const activeActivity = await findLastActivityByUser(user.id);
    const isIntensiveMode = Boolean(
      activeActivity?.intensiveUntil &&
      activeActivity.intensiveUntil > new Date(),
    );

    if (
      user.planStatus === "active" &&
      user.planExpiresAt &&
      user.planExpiresAt < new Date()
    ) {
      // TODO: refactory - mover para rotina diária de cron
      await updateUserPlanStatus(user.id, "expired");
      user.planStatus = "expired";
    }

    const parsed = parseMessage(text, { isIntensiveMode });
    const pendingIntent = user.pendingIntent as MessageIntent | undefined;

    // ─── Verificação de plano expirado ───────────────────────────────────────

    if (!canPractice(user)) {
      if (
        pendingIntent === "support" &&
        parsed.intent !== "cancel" &&
        parsed.intent !== "cancel_no"
      ) {
        const channelCode =
          userChannel.channelUsername ??
          userChannel.channelUserPhone ??
          userChannel.channelUserId;
        const planLabel = user.planCode === "pro" ? "Pro" : "Trial";
        const supportMsg = formatInternalSupportMessage(
          channelCode,
          planLabel,
          text,
        );
        if (process.env.WA_SUPPORT) {
          try {
            await sendWhatsAppMessage(process.env.WA_SUPPORT, supportMsg.text);
          } catch {
            // notificação interna, falha silenciosa
          }
        }
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "free_text",
          input,
          today,
        );
        const supportReply = formatSupportReceived();
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: supportReply,
          today,
        });
        return;
      }
      if (
        parsed.intent === "list_commands" ||
        parsed.intent === "unknown_command"
      ) {
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "list_commands",
          input,
          today,
        );
        const cmdReply = formatCommandList(user.level ?? null);
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: cmdReply,
          today,
        });
        return;
      }

      if (parsed.intent === "list_activities") {
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "list_activities",
          input,
          today,
        );
        const activities = await findActivitiesForList(user.id);
        const activitiesReply = formatActivitiesList(activities);
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: activitiesReply,
          today,
        });
        return;
      }

      if (parsed.intent === "support") {
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "support",
          input,
          today,
        );
        const supportPrompt = formatSupportRequest();
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: supportPrompt,
          today,
        });
        return;
      }

      if (parsed.intent === "cancel" || parsed.intent === "cancel_no") {
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "cancel",
          input,
          today,
        );
        const cancelReply = formatCanceled();
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: cancelReply,
          today,
        });
        return;
      }

      await saveUserMsg(
        user.id,
        userChannel.id,
        text,
        "free_text",
        input,
        today,
      );
      const checkoutUrl = await getOrCreateCheckoutUrl(user.id);
      const expiredReply = formatPlanExpired(user.planCode, checkoutUrl);
      await sendAndSaveMessage({
        channel,
        to: userChannel.channelUserId,
        userId: user.id,
        userChannelId: userChannel.id,
        message: expiredReply,
        today,
      });
      return;
    }

    // ─── Onboarding ──────────────────────────────────────────────────────────

    if (!user.onboardedAt) {
      await markUserOnboarded(user.id);
      try {
        if (userChannel.channelUserPhone) {
          await markWaitlistActive(userChannel.channelUserPhone);
        }
      } catch (e) {
        console.error(
          `[handleIncomingMessage] Error to mark user ${user.id} as active in waitlist`,
          e,
        );
      }

      await saveUserMsg(
        user.id,
        userChannel.id,
        text,
        "free_text",
        input,
        today,
      );
      const msgs = [
        formatOnboardingMsg1(),
        formatOnboardingMsg2(),
        formatOnboardingMsg3(),
        formatOnboardingMsg4(),
        formatOnboardingMsg5(),
      ];

      for (let i = 0; i < msgs.length; i++) {
        if (i > 0) await delay(ONBOARDING_MESSAGE_INTERVAL_SEC);
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: msgs[i],
          today,
        });
      }

      await delay(ONBOARDING_MESSAGE_INTERVAL_SEC);
      await startNewActivityFlow(
        user,
        userChannel.id,
        today,
        channel,
        userChannel.channelUserId,
      );
      return;
    }

    // ─── Imagem bloqueada ou ilegível ────────────────────────────────────────

    if (
      input.mediaType === "image" &&
      (input.mediaMetadata?.status === "blocked" ||
        input.mediaMetadata?.status === "unreadable")
    ) {
      const intent: MessageIntent =
        input.mediaMetadata.status === "blocked"
          ? "image_blocked"
          : "image_unreadable";
      await saveUserMsg(
        user.id,
        userChannel.id,
        String(input.mediaMetadata.statusMessage ?? ""),
        intent,
        input,
        today,
      );
      const reply =
        input.mediaMetadata.status === "blocked"
          ? formatImageBlocked()
          : formatImageUnreadable();
      await sendAndSaveMessage({
        channel,
        to: userChannel.channelUserId,
        userId: user.id,
        userChannelId: userChannel.id,
        message: reply,
        today,
      });
      return;
    }

    // ─── Mídia → buffer de Doc ───────────────────────────────────────────────

    if (
      input.mediaType === "image" ||
      input.mediaType === "pdf" ||
      input.mediaType === "text"
    ) {
      if (
        pendingIntent === "waiting_set_activity_domain" ||
        pendingIntent === "waiting_set_activity_topic" ||
        pendingIntent === "waiting_set_activity_focus"
      ) {
        await updateUserPendingIntent(user.id, null);
      }
      const docType = input.mediaType as DocType;
      await handleDocUpload(
        user.id,
        userChannel.id,
        text,
        docType,
        today,
        input,
        channel,
        userChannel.channelUserId,
      );
      return;
    }

    // ─── Estado pendente ──────────────────────────────────────────────────────

    if (
      (pendingIntent === "waiting_set_activity_domain" ||
        pendingIntent === "waiting_set_activity_topic" ||
        pendingIntent === "waiting_set_activity_focus") &&
      parsed.intent === "cancel"
    ) {
      await updateUserPendingIntent(user.id, null);
      await saveUserMsg(user.id, userChannel.id, text, "cancel", input, today);
      const flowCancelledReply = formatNewActivityFlowCanceled(
        Boolean(activeActivity),
      );
      await sendAndSaveMessage({
        channel,
        to: userChannel.channelUserId,
        userId: user.id,
        userChannelId: userChannel.id,
        message: flowCancelledReply,
        today,
      });

      const activitiesForList = await findActivitiesForList(user.id);
      if (activitiesForList.length > 0) {
        return;
      }

      const activityCount = await countAllActivitiesByUser(user.id);
      const guidanceReply =
        activityCount === 0
          ? formatFirstNewActivityCanceled()
          : formatNewActivityFlowCanceledGuidance();
      await sendAndSaveMessage({
        channel,
        to: userChannel.channelUserId,
        userId: user.id,
        userChannelId: userChannel.id,
        message: guidanceReply,
        today,
      });
      return;
    }

    if (pendingIntent === "waiting_set_level" && parsed.intent === "cancel") {
      await updateUserPendingIntent(user.id, null);
      await saveUserMsg(user.id, userChannel.id, text, "cancel", input, today);
      const pendingDocForLevel = await findPendingDocByUser(user.id);
      if (pendingDocForLevel) {
        await updateDoc(pendingDocForLevel.id, user.id, { status: "canceled" });
      }
      const cancelledReply = formatNewActivityFlowCanceled();
      await sendAndSaveMessage({
        channel,
        to: userChannel.channelUserId,
        userId: user.id,
        userChannelId: userChannel.id,
        message: cancelledReply,
        today,
      });

      if (user.level === null) {
        const guidanceReply = formatSetFirstLevelCanceled();
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: guidanceReply,
          today,
        });
      }
      return;
    }

    const isOverriding = OVERRIDING_INTENTS.includes(parsed.intent);

    if (pendingIntent && !isOverriding) {
      // Aguardando captura de nível
      if (pendingIntent === "waiting_set_level") {
        if (parsed.intent === "set_level") {
          // nivel durante captura em andamento: reenviar pergunta
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "waiting_set_level",
            input,
            today,
          );
          const levelMsg = formatLevelQuestion();
          await sendAndSaveMessage({
            channel,
            to: userChannel.channelUserId,
            userId: user.id,
            userChannelId: userChannel.id,
            message: levelMsg,
            today,
          });
          return;
        }

        const { outcome, message } = await processLevelResponse(text, user.id);
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message,
          today,
        });

        if (outcome === "captured") {
          const levelFlowData = getIntentData(user);
          if (levelFlowData?.flow === "new_activity") {
            await sendDomainQuestion(
              user.id,
              userChannel.id,
              today,
              channel,
              userChannel.channelUserId,
            );
            await saveUserMsg(
              user.id,
              userChannel.id,
              text,
              "waiting_set_activity_domain",
              input,
              today,
            );
            return;
          }

          await updateUserPendingIntent(user.id, null);
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "free_text",
            input,
            today,
          );
          const pendingDocToResume = await findPendingDocByUser(user.id);
          if (pendingDocToResume) {
            await publishDocProcessing(pendingDocToResume.id, user.id);
          }
          return;
        }

        const levelIntent: MessageIntent =
          outcome === "invalid" ? "waiting_set_level" : "free_text";
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          levelIntent,
          input,
          today,
        );
        return;
      }

      // Aguardando escolha de objetivo (domain)
      if (pendingIntent === "waiting_set_activity_domain") {
        const result = processDomainResponse(text);
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: result.message,
          today,
        });

        if (result.outcome === "canceled") {
          await updateUserPendingIntent(user.id, null);
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "cancel",
            input,
            today,
          );
          return;
        }
        if (result.outcome === "invalid") {
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "waiting_set_activity_domain",
            input,
            today,
          );
          return;
        }

        const topicData: NewActivityIntentData = {
          flow: "new_activity",
          domain: result.domain,
        };
        await updateUserPendingIntent(
          user.id,
          "waiting_set_activity_topic",
          topicData,
        );
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "waiting_set_activity_topic",
          input,
          today,
        );
        return;
      }

      // Aguardando tema livre (topic)
      if (pendingIntent === "waiting_set_activity_topic") {
        const flowData = getIntentData(user);
        const domain = flowData?.domain;
        const userLevel = user.level;

        if (!userLevel || !domain) {
          // não deveria acontecer: nível e objetivo são sempre capturados antes deste passo
          await updateUserPendingIntent(user.id, null);
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "free_text",
            input,
            today,
          );
          const errReply = formatNewActivityFlowCanceled();
          await sendAndSaveMessage({
            channel,
            to: userChannel.channelUserId,
            userId: user.id,
            userChannelId: userChannel.id,
            message: errReply,
            today,
          });
          return;
        }

        const result = await processTopicResponse(
          text,
          user.id,
          userLevel,
          domain,
        );

        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: result.message,
          today,
        });

        if (result.outcome !== "captured") {
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "waiting_set_activity_topic",
            input,
            today,
          );
          return;
        }

        const focusData: NewActivityIntentData = {
          flow: "new_activity",
          domain,
          topic: result.topic,
          focusSuggestions: result.focusSuggestions,
          subtopics: result.subtopics,
        };
        await updateUserPendingIntent(
          user.id,
          "waiting_set_activity_focus",
          focusData,
        );
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "waiting_set_activity_focus",
          input,
          today,
        );
        return;
      }

      // Aguardando escolha de foco (focus) e geração do conteúdo
      if (pendingIntent === "waiting_set_activity_focus") {
        const flowData = getIntentData(user);
        const domain = flowData?.domain;
        const topic = flowData?.topic;
        const focusSuggestions = flowData?.focusSuggestions;
        const subtopics = flowData?.subtopics;
        const userLevel = user.level;

        if (
          !userLevel ||
          !domain ||
          !topic ||
          !focusSuggestions ||
          !subtopics
        ) {
          // não deveria acontecer: nível, objetivo e tema são sempre capturados antes deste passo
          await updateUserPendingIntent(user.id, null);
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "free_text",
            input,
            today,
          );
          const errReply = formatNewActivityFlowCanceled();
          await sendAndSaveMessage({
            channel,
            to: userChannel.channelUserId,
            userId: user.id,
            userChannelId: userChannel.id,
            message: errReply,
            today,
          });
          return;
        }

        const result = await processFocusResponse(
          text,
          focusSuggestions,
          subtopics,
          user.id,
          userLevel,
          domain,
          topic,
          channel,
        );

        if (result.outcome === "done") {
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "free_text",
            input,
            today,
          );
          return;
        }

        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: result.message,
          today,
        });
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "waiting_set_activity_focus",
          input,
          today,
        );
        return;
      }

      // Aguardando sim ou não para substituir doc ativo
      if (pendingIntent === "waiting_doc_replace") {
        await updateUserPendingIntent(user.id, null);
        const lastUserMessage = await findLastUserMessage(user.id);
        if (!lastUserMessage) {
          const noPendingReply = formatNoPendingAction();
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "free_text",
            input,
            today,
          );
          await sendAndSaveMessage({
            channel,
            to: userChannel.channelUserId,
            userId: user.id,
            userChannelId: userChannel.id,
            message: noPendingReply,
            today,
          });
          return;
        }
        if (parsed.intent === "confirm") {
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "confirm",
            input,
            today,
          );
          const mt = lastUserMessage.mediaType;
          const originalDocType: DocType =
            mt === "audio" || mt === "image" || mt === "pdf"
              ? (mt as DocType)
              : "text";
          await createPendingBuffer(
            user.id,
            userChannel.id,
            lastUserMessage.content,
            originalDocType,
            today,
            channel,
            userChannel.channelUserId,
            lastUserMessage.id,
          );
          return;
        }

        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "cancel",
          input,
          today,
        );
        const reply = formatActivityReplaceCanceled();
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: reply,
          today,
        });
        return;
      }

      // Aguardando mensagem de suporte
      if (pendingIntent === "support") {
        await updateUserPendingIntent(user.id, null);
        const channelCode =
          userChannel.channelUsername ??
          userChannel.channelUserPhone ??
          userChannel.channelUserId;
        const planLabel = user.planCode === "pro" ? "Pro" : "Trial";
        const supportMsg = formatInternalSupportMessage(
          channelCode,
          planLabel,
          text,
        );
        const supportNumber = process.env.WA_SUPPORT;
        if (supportNumber) {
          try {
            await sendWhatsAppMessage(supportNumber, supportMsg.text);
          } catch {
            // notificação interna, falha silenciosa
          }
        }

        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "free_text",
          input,
          today,
        );
        const reply = formatSupportReceived();
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: reply,
          today,
        });
        return;
      }
    }

    // ─── Fluxo normal ────────────────────────────────────────────────────────

    // waitingUser === true → ignora match de comando, trata como resposta de prática
    const effectiveIntent: MessageIntent =
      activeActivity?.waitingUser &&
      parsed.intent !== "free_text" &&
      !OVERRIDING_INTENTS.includes(parsed.intent)
        ? "free_text"
        : parsed.intent;

    let messageIntent: MessageIntent = effectiveIntent;
    let reply: FormattedMessage = { text: "" };

    switch (effectiveIntent) {
      case "list_commands":
      case "unknown_command": {
        reply = formatCommandList(user.level ?? null);
        break;
      }

      case "list_activities": {
        const activities = await findActivitiesForList(user.id);
        reply = formatActivitiesList(activities);
        break;
      }

      case "set_level": {
        await updateUserPendingIntent(user.id, "waiting_set_level");
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "waiting_set_level",
          input,
          today,
        );
        const levelMsg = formatLevelQuestion();
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: levelMsg,
          today,
        });
        return;
      }

      case "new_activity": {
        const { nextIntent } = await startNewActivityFlow(
          user,
          userChannel.id,
          today,
          channel,
          userChannel.channelUserId,
        );
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          nextIntent,
          input,
          today,
        );
        return;
      }

      case "support": {
        reply = formatSupportRequest();
        break;
      }

      case "pause_activity": {
        const current = await findCurrentActivityByUser(user.id);
        if (!current || current.status !== "active") {
          reply = formatNoPausableDocs();
          messageIntent = "free_text";
          break;
        }
        await updateActivity(current.id, user.id, {
          status: "paused",
          statusUpdatedAt: new Date(),
          pausedAt: new Date(),
          intensiveUntil: null,
        });
        reply = formatPauseSuccess(current.title);
        messageIntent = "free_text";
        break;
      }

      case "resume_activity": {
        let target: Activity | null;

        if (parsed.docIndex !== undefined) {
          const activities = await findActivitiesForList(user.id);
          target =
            selectArchivedActivities(activities)[parsed.docIndex - 1] ?? null;
          if (!target) {
            reply = formatInvalidResumeIndex();
            messageIntent = "free_text";
            break;
          }
        } else {
          target = await findCurrentActivityByUser(user.id);
          if (!target || target.status !== "paused") {
            reply = formatNoPausedDocs();
            messageIntent = "free_text";
            break;
          }
        }

        await switchToActivity(user.id, target);
        reply = formatResumeSuccess(target.title);
        messageIntent = "free_text";
        break;
      }

      case "practice_now": {
        if (!activeActivity) {
          reply = formatNoActiveActivity();
          messageIntent = "free_text";
          break;
        }
        const practiceNowUsage = await getTodayUsage(user.id, today);
        if (
          !canPracticeToday(
            practiceNowUsage?.practiceCount ?? 0,
            practiceNowUsage?.intensiveCount ?? 0,
            true,
          )
        ) {
          const limitMsg =
            (practiceNowUsage?.practiceCount ?? 0) >= DAILY_PRACTICE_LIMIT
              ? formatDailyPracticeLimitReached()
              : formatIntensiveDailyLimitReached();
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "practice_now",
            input,
            today,
          );
          await sendAndSaveMessage({
            channel,
            to: userChannel.channelUserId,
            userId: user.id,
            userChannelId: userChannel.id,
            message: limitMsg,
            today,
          });
          return;
        }
        const intensiveUntil = new Date(
          Date.now() + INTENSIVE_UNTIL_MIN * 60 * 1000,
        );
        await updateActivity(activeActivity.id, user.id, { intensiveUntil });
        const alreadyPending = await findPendingQuestion(activeActivity.id);
        if (alreadyPending) {
          await saveUserMsg(
            user.id,
            userChannel.id,
            text,
            "practice_now",
            input,
            today,
          );
          const pendingReply = formatIntensiveModeActivated({
            isIntensiveMode,
            hasPendingQuestion: true,
          });
          await sendAndSaveMessage({
            channel,
            to: userChannel.channelUserId,
            userId: user.id,
            userChannelId: userChannel.id,
            message: pendingReply,
            today,
          });
          return;
        }

        const replyActivation = formatIntensiveModeActivated({
          isIntensiveMode,
        });
        await sendAndSaveMessage({
          channel,
          to: userChannel.channelUserId,
          userId: user.id,
          userChannelId: userChannel.id,
          message: replyActivation,
          today,
        });

        await delay(DEFAULT_MESSAGE_INTERVAL_SEC);
        await handleIntensiveNextQuestion(
          activeActivity,
          user.id,
          userChannel.id,
          today,
          channel,
          userChannel.channelUserId,
        );
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "practice_now",
          input,
          today,
        );
        return;
      }

      case "pause_practice": {
        if (!activeActivity) {
          reply = formatNoActiveActivity();
          messageIntent = "free_text";
          break;
        }

        await updateActivity(activeActivity!.id, user.id, {
          intensiveUntil: null,
        });
        const pendingQuestion = await findPendingQuestion(activeActivity.id);
        reply = formatIntensiveModeStopped(!!pendingQuestion);
        messageIntent = "free_text";
        break;
      }

      case "confirm":
      case "cancel_no": {
        reply = formatNoPendingAction();
        messageIntent = "free_text";
        break;
      }

      case "cancel": {
        const pendingDoc = await findPendingDocByUser(user.id);
        if (pendingDoc) {
          await updateDoc(pendingDoc.id, user.id, { status: "canceled" });
          reply = formatCanceled();
        } else {
          reply = formatNoPendingAction();
        }
        messageIntent = "free_text";
        break;
      }

      case "free_text": {
        if (!activeActivity) {
          reply = formatNoActivity();
          break;
        }

        if (
          activeActivity?.intensiveUntil &&
          activeActivity.intensiveUntil <= new Date()
        ) {
          await updateActivity(activeActivity.id, user.id, {
            intensiveUntil: null,
          });
          activeActivity.intensiveUntil = null;
        }

        if (activeActivity?.waitingUser) {
          const practiceDoc = await findDocById(activeActivity.docId, user.id);
          if (practiceDoc) {
            const pendingQuestion = await findPendingQuestion(
              activeActivity.id,
            );
            if (pendingQuestion) {
              const questionFormats = [
                pendingQuestion.questionFormat,
              ] as QuestionFormat[];

              const feedbackExamples = pendingQuestion.questionFormat
                ? getFeedbackExamples(questionFormats, activeActivity.userLevel)
                : "";

              const questionForEvaluation = formatQuestion({
                question: pendingQuestion.question,
                questionFormat: pendingQuestion.questionFormat,
                questionOptions: pendingQuestion.questionOptions,
                termHint: pendingQuestion.termHint,
              }).text;

              const evaluation = await generateAnswerEvaluation({
                question: questionForEvaluation,
                answerKeys: pendingQuestion.answerKeys,
                userAnswer: text,
                attemptCount: pendingQuestion.attemptCount,
                docContent: practiceDoc.content ?? "",
                feedbackExamples: feedbackExamples,
                questionFormat: pendingQuestion.questionFormat ?? "",
                level: activeActivity.userLevel,
                userId: user.id,
                docId: practiceDoc.id,
                questionFormats,
              });
              const evalStatus = evaluation?.status ?? "wrong";
              const feedback = evaluation
                ? formatFeedback(evaluation, activeActivity.userLevel)
                : formatFeedbackFailed();
              const feedbackAudioPath = evaluation
                ? await resolveFeedbackAudioPath(evaluation, pendingQuestion.id)
                : null;
              const feedbackSpeechText = evaluation
                ? formatFeedbackToSpeech(evaluation)
                : null;
              const evalTip = !evaluation?.user_unknown
                ? evaluation?.eval_tip
                : null;
              const silent =
                evaluation?.eval_tip_class === "none" ||
                evaluation?.eval_tip_class === "spelling";
              // silent já exclui "none" e "spelling"; cast seguro para o enum do banco
              const tipClass = evalTip && !silent
                ? (evaluation?.eval_tip_class as EvalTipClass)
                : null;
              const tipMsg = evalTip ? formatEvalTip(evalTip) : null;
              let tipSent = false;
              const answerType = input.isVoiceNote ? "audio" : "text";
              if (input.isVoiceNote && input.voiceAudioBuffer) {
                await resolveAnswerAudioPath(
                  input.voiceAudioBuffer,
                  input.voiceAudioMimeType ?? "audio/ogg",
                  text,
                  pendingQuestion.id,
                );
              }
              const isWrongOrPartial =
                evalStatus === "wrong" || evalStatus === "partial";
              const sm2 = calcSm2(
                pendingQuestion.easeFactor,
                pendingQuestion.interval,
                pendingQuestion.nextRevisionAt,
                evalStatus,
              );
              const isRealRevision =
                pendingQuestion.attemptCount > 0 && sm2 !== null;
              const scoreMetadata = updateScoreMetadata(
                pendingQuestion,
                evalStatus,
                answerType,
                isRealRevision,
              );
              await updateQuestion(pendingQuestion.id, {
                answer: text,
                status: evalStatus,
                attemptCount: pendingQuestion.attemptCount + 1,
                answerType,
                ...(isRealRevision
                  ? { revisionCount: pendingQuestion.revisionCount + 1 }
                  : {}),
                ...(isWrongOrPartial
                  ? { wrongCount: pendingQuestion.wrongCount + 1 }
                  : {}),
                ...(sm2 !== null
                  ? {
                      easeFactor: sm2.easeFactor,
                      interval: sm2.interval,
                      nextRevisionAt: sm2.nextRevisionAt,
                    }
                  : {}),
                provider: evaluation?.provider,
                model: evaluation?.model,
                evalTip: evalTip || null,
                evalTipClass: tipClass ?? null,
                metadata: scoreMetadata,
                score: computeQuestionScore(scoreMetadata),
              });
              const updatedCounts = await incrementDailyPracticeCount(
                user.id,
                today,
                isIntensiveMode,
              );
              const canContinueIntensive = canPracticeToday(
                updatedCounts.practiceCount,
                updatedCounts.intensiveCount,
                isIntensiveMode,
              );
              const isPracticingSessionActive =
                canContinueIntensive &&
                activeActivity.intensiveUntil &&
                activeActivity.intensiveUntil > new Date();
              const interactionCount = activeActivity.interactionCount + 1;
              await updateActivity(activeActivity.id, user.id, {
                waitingUser: false,
                interactionCount,
                lastInteractionAt: new Date(),
                nextMessageAt: new Date(
                  Date.now() + activeActivity.intervalMinutes * 60 * 1000,
                ),
                lastNudgeStep: null,
                lastNudgeAt: null,
              });
              await saveUserMsg(
                user.id,
                userChannel.id,
                text,
                "free_text",
                input,
                today,
              );
              await sendAndSaveMessage({
                channel,
                to: userChannel.channelUserId,
                userId: user.id,
                userChannelId: userChannel.id,
                activityId: activeActivity.id,
                message: feedback,
                intent: "practice_feedback",
                questionId: pendingQuestion.id,
                today,
              });

              if (feedbackAudioPath) {
                await sendAndSaveMessage({
                  channel,
                  to: userChannel.channelUserId,
                  userId: user.id,
                  userChannelId: userChannel.id,
                  activityId: activeActivity.id,
                  message: {
                    ...(feedbackSpeechText ?? feedback),
                    audioPath: feedbackAudioPath,
                  },
                  intent: "practice_feedback",
                  questionId: pendingQuestion.id,
                  mediaType: "audio",
                  mediaId: feedbackAudioPath,
                  today,
                });
              }

              if (isIntensiveMode && !canContinueIntensive) {
                const limitMsg =
                  updatedCounts.practiceCount >= DAILY_PRACTICE_LIMIT
                    ? formatDailyPracticeLimitReached()
                    : formatIntensiveDailyLimitReached();
                await updateActivity(activeActivity.id, user.id, {
                  intensiveUntil: null,
                });
                await delay(AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC);
                if (tipMsg) {
                  await sendAndSaveMessage({
                    channel,
                    to: userChannel.channelUserId,
                    userId: user.id,
                    userChannelId: userChannel.id,
                    activityId: activeActivity.id,
                    message: tipMsg,
                    intent: "eval_tip",
                    questionId: pendingQuestion.id,
                    today,
                  });
                }
                await sendAndSaveMessage({
                  channel,
                  to: userChannel.channelUserId,
                  userId: user.id,
                  userChannelId: userChannel.id,
                  activityId: activeActivity.id,
                  message: limitMsg,
                  intent: "practice_feedback",
                  today,
                });
                return;
              }

              if (isPracticingSessionActive) {
                await delay(AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC);
                if (tipMsg) {
                  tipSent = true;
                  await sendAndSaveMessage({
                    channel,
                    to: userChannel.channelUserId,
                    userId: user.id,
                    userChannelId: userChannel.id,
                    activityId: activeActivity.id,
                    message: tipMsg,
                    intent: "eval_tip",
                    questionId: pendingQuestion.id,
                    today,
                  });
                }
                const sent = await handleIntensiveNextQuestion(
                  activeActivity,
                  user.id,
                  userChannel.id,
                  today,
                  channel,
                  userChannel.channelUserId,
                );
                if (sent) return;
              }

              if (interactionCount === 1) {
                const guideMsg = formatGuideAfterFirstFeedback();
                await delay(AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC);
                if (tipMsg && !tipSent) {
                  await sendAndSaveMessage({
                    channel,
                    to: userChannel.channelUserId,
                    userId: user.id,
                    userChannelId: userChannel.id,
                    activityId: activeActivity.id,
                    message: tipMsg,
                    intent: "eval_tip",
                    questionId: pendingQuestion.id,
                    today,
                  });
                  await delay(AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC);
                }
                await sendAndSaveMessage({
                  channel,
                  to: userChannel.channelUserId,
                  userId: user.id,
                  userChannelId: userChannel.id,
                  activityId: activeActivity.id,
                  message: guideMsg,
                  intent: "guide_after_first_feedback",
                  today,
                });
                return;
              }

              if (tipMsg && !tipSent) {
                await delay(AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC);
                await sendAndSaveMessage({
                  channel,
                  to: userChannel.channelUserId,
                  userId: user.id,
                  userChannelId: userChannel.id,
                  activityId: activeActivity.id,
                  message: tipMsg,
                  intent: "eval_tip",
                  questionId: pendingQuestion.id,
                  today,
                });
              }

              await maybeSendActivitySuggestion({
                activity: activeActivity,
                userId: user.id,
                userChannelId: userChannel.id,
                isIntensiveMode,
                isLastAnswerCorrect: evalStatus === "right",
                channel,
                to: userChannel.channelUserId,
                today,
              });

              return;
            }
          }
        }

        reply = formatPracticeWaiting();
        break;
      }
    }

    const SWITCH_PENDING_STATES: MessageIntent[] = [
      "waiting_doc_replace",
      "support",
    ];
    const nextPending = SWITCH_PENDING_STATES.includes(
      messageIntent as MessageIntent,
    )
      ? messageIntent
      : null;
    if (user.pendingIntent !== "waiting_set_level" || nextPending !== null) {
      await updateUserPendingIntent(user.id, nextPending);
    }

    await saveUserMsg(
      user.id,
      userChannel.id,
      text,
      messageIntent,
      input,
      today,
    );
    await sendAndSaveMessage({
      channel,
      to: userChannel.channelUserId,
      userId: user.id,
      userChannelId: userChannel.id,
      message: reply,
      today,
    });
    return;
  } finally {
    await updateUserLastResponse(user.id, messageId);
  }
}

async function handleIntensiveNextQuestion(
  activity: Activity,
  userId: string,
  userChannelId: string,
  today: Date,
  channel: MessageChannel,
  to: string,
): Promise<boolean> {
  const {
    id: activityId,
    docId,
    lastQuestionId,
    roundCompleted,
    intervalMinutes,
    executionCount,
  } = activity;
  const lastId = lastQuestionId;

  if (!roundCompleted) {
    const sm2 = await findSm2EligibleQuestion(activityId, lastId);
    if (sm2) {
      await sendIntensiveQuestion(
        sm2,
        activity,
        userId,
        userChannelId,
        executionCount,
        intervalMinutes,
        today,
        channel,
        to,
      );
      return true;
    }

    const unanswered = await findNextUnansweredQuestion(docId, lastId);
    if (unanswered) {
      await sendIntensiveQuestion(
        unanswered,
        activity,
        userId,
        userChannelId,
        executionCount,
        intervalMinutes,
        today,
        channel,
        to,
      );
      return true;
    }

    const outcome = await generateQuestionIfPoolNotFull(activity);
    if (!outcome.poolExhausted) {
      if (outcome.question) {
        await sendIntensiveQuestion(
          outcome.question,
          activity,
          userId,
          userChannelId,
          executionCount,
          intervalMinutes,
          today,
          channel,
          to,
        );
        return true;
      }
      const pendingMsg = formatIntensivePendingQuestion();
      await sendAndSaveMessage({
        channel,
        to,
        userId,
        userChannelId,
        activityId,
        message: pendingMsg,
        intent: "pending_question",
        today,
      });
      return true;
    }

    await completeRoundZero(
      activityId,
      userId,
      today,
      userChannelId,
      intervalMinutes,
      channel,
      to,
    );
    const next = await findNextGeneralQuestion(activityId, lastId);
    if (next) {
      await delay(DEFAULT_MESSAGE_INTERVAL_SEC);
      await sendIntensiveQuestion(
        next,
        activity,
        userId,
        userChannelId,
        executionCount,
        intervalMinutes,
        today,
        channel,
        to,
      );
    }
    return true;
  }

  const next = await findNextGeneralQuestion(activityId, lastId);
  if (next) {
    await sendIntensiveQuestion(
      next,
      activity,
      userId,
      userChannelId,
      executionCount,
      intervalMinutes,
      today,
      channel,
      to,
    );
    return true;
  }
  return false;
}

async function sendIntensiveQuestion(
  question: {
    id: string;
    question: string;
    questionFormat: QuestionFormat | null;
    questionOptions: string[];
    termHint?: string | null;
  },
  activity: Activity,
  userId: string,
  userChannelId: string,
  executionCount: number,
  intervalMinutes: number,
  today: Date,
  channel: MessageChannel,
  to: string,
): Promise<void> {
  if (executionCount === 0) {
    const startMsg = formatActivityStart(activity.title);
    await sendAndSaveMessage({
      channel,
      to,
      userId,
      userChannelId,
      activityId: activity.id,
      message: startMsg,
      intent: "activity_start",
      today,
    });
    await delay(DEFAULT_MESSAGE_INTERVAL_SEC);
  }

  const questionText = formatQuestion(question);

  await sendAndSaveMessage({
    channel,
    to,
    userId,
    userChannelId,
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
  await updateActivity(activity.id, userId, {
    waitingUser: true,
    executionCount: executionCount + 1,
    lastQuestionId: question.id,
    nextMessageAt: new Date(Date.now() + intervalMinutes * 60 * 1000),
    intensiveUntil: new Date(Date.now() + INTENSIVE_UNTIL_MIN * 60 * 1000),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function saveUserMsg(
  userId: string,
  userChannelId: string,
  content: string,
  intent: MessageIntent,
  input: Pick<
    IncomingMessage,
    "externalId" | "mediaType" | "mediaId" | "mediaMetadata" | "receivedAt"
  >,
  today: Date,
  metadataOverride?: Record<string, string | number | null>,
): Promise<Message> {
  const message = await saveMessage({
    userId,
    userChannelId,
    role: "user",
    content,
    intent,
    externalId: input.externalId,
    mediaType: input.mediaType,
    mediaId: input.mediaId,
    metadata: metadataOverride ?? input.mediaMetadata,
    receivedAt: input.receivedAt,
  });
  await incrementUserMessageCount(userId, today);
  await saveImageMedia(message.id, input, content);
  return message;
}

async function saveImageMedia(
  messageId: string,
  input: Pick<IncomingMessage, "mediaType" | "mediaMetadata">,
  transcription: string,
): Promise<void> {
  const mediaPath = input.mediaMetadata?.mediaPath;
  if (input.mediaType !== "image" || typeof mediaPath !== "string") return;
  const format = input.mediaMetadata?.format;
  const sizeBytes = input.mediaMetadata?.sizeBytes;
  await createMedia({
    parentId: messageId,
    parentType: MEDIA_PARENT_TYPE.MESSAGE,
    mediaType: "image",
    contentType: `image/${typeof format === "string" ? format : "jpeg"}`,
    mediaPath,
    mediaSize: typeof sizeBytes === "number" ? sizeBytes : 0,
    mediaTranscription: transcription,
  });
}

function getIntentData(user: {
  metadata: unknown;
}): NewActivityIntentData | undefined {
  const metadata = user.metadata as UserIntentMetadata | null;
  return metadata?.intent_data;
}

async function sendDomainQuestion(
  userId: string,
  userChannelId: string,
  today: Date,
  channel: MessageChannel,
  to: string,
): Promise<void> {
  const domainData: NewActivityIntentData = { flow: "new_activity" };
  await updateUserPendingIntent(
    userId,
    "waiting_set_activity_domain",
    domainData,
  );
  const domainMsg = formatDomainQuestion();
  await sendAndSaveMessage({
    channel,
    to,
    userId,
    userChannelId,
    message: domainMsg,
    today,
  });
}

async function startNewActivityFlow(
  user: { id: string; level: Level | null },
  userChannelId: string,
  today: Date,
  channel: MessageChannel,
  to: string,
): Promise<{ nextIntent: MessageIntent }> {
  if (!user.level) {
    const levelFlowData: NewActivityIntentData = { flow: "new_activity" };
    await updateUserPendingIntent(user.id, "waiting_set_level", levelFlowData);
    const levelMsg = formatLevelQuestion();
    await sendAndSaveMessage({
      channel,
      to,
      userId: user.id,
      userChannelId,
      message: levelMsg,
      today,
    });
    return { nextIntent: "waiting_set_level" };
  }
  await sendDomainQuestion(user.id, userChannelId, today, channel, to);
  return { nextIntent: "waiting_set_activity_domain" };
}

async function createPendingBuffer(
  userId: string,
  userChannelId: string,
  rawContent: string,
  docType: DocType,
  today: Date,
  channel: MessageChannel,
  to: string,
  messageId?: string,
): Promise<void> {
  const doc = await createDoc({
    userId,
    docType,
    status: "pending",
  });
  const docItem = await createDocItem({
    docId: doc.id,
    userId,
    messageId,
    docType,
    rawContent,
    order: 1,
  });
  await publishDocMerge(doc.id, userId, docItem.id);
  const reply = formatDocItemReceived(1);
  await sendAndSaveMessage({
    channel,
    to,
    userId,
    userChannelId,
    message: reply,
    today,
  });
}

async function handleDocUpload(
  userId: string,
  userChannelId: string,
  rawContent: string,
  docType: DocType,
  today: Date,
  input: Pick<
    IncomingMessage,
    "externalId" | "mediaType" | "mediaId" | "mediaMetadata" | "receivedAt"
  >,
  channel: MessageChannel,
  to: string,
): Promise<void> {
  const pendingDoc = await findPendingDocByUser(userId);
  if (pendingDoc) {
    const validCount = await countValidDocItemsByDoc(pendingDoc.id);
    if (!canAddDocItem(validCount)) {
      await saveUserMsg(
        userId,
        userChannelId,
        rawContent,
        "free_text",
        input,
        today,
      );
      const reply = formatDocItemLimitReached();
      await sendAndSaveMessage({
        channel,
        to,
        userId,
        userChannelId,
        message: reply,
        today,
      });
      return;
    }
    const itemValidation = validateDocItemInput(rawContent, docType);
    const savedMsg = await saveMessage({
      userId,
      userChannelId,
      role: "user",
      content: rawContent,
      intent: "free_text",
      externalId: input.externalId,
      mediaType: input.mediaType,
      mediaId: input.mediaId,
      metadata: input.mediaMetadata,
      receivedAt: input.receivedAt,
    });
    await incrementUserMessageCount(userId, today);
    await saveImageMedia(savedMsg.id, input, rawContent);
    if (!itemValidation.success) {
      await sendAndSaveMessage({
        channel,
        to,
        userId,
        userChannelId,
        message: { text: itemValidation.error },
        today,
      });
      return;
    }
    const docItem = await createDocItem({
      docId: pendingDoc.id,
      userId,
      messageId: savedMsg.id,
      docType,
      rawContent,
      order: validCount + 1,
    });
    await publishDocMerge(pendingDoc.id, userId, docItem.id);
    const reply = formatDocItemReceived(validCount + 1);
    await sendAndSaveMessage({
      channel,
      to,
      userId,
      userChannelId,
      message: reply,
      today,
    });
    return;
  }

  const activityCount = await getTodayActivityCount(userId, today);
  if (!canStartActivity(activityCount)) {
    await saveUserMsg(
      userId,
      userChannelId,
      rawContent,
      "free_text",
      input,
      today,
    );
    const reply = formatDailyActivityLimitReached();
    await sendAndSaveMessage({
      channel,
      to,
      userId,
      userChannelId,
      message: reply,
      today,
    });
    return;
  }

  const itemValidation = validateDocItemInput(rawContent, docType);
  if (!itemValidation.success) {
    await saveUserMsg(
      userId,
      userChannelId,
      rawContent,
      "free_text",
      input,
      today,
    );
    await sendAndSaveMessage({
      channel,
      to,
      userId,
      userChannelId,
      message: { text: itemValidation.error },
      today,
    });
    return;
  }

  const activeActivity = await findLastActivityByUser(userId);
  if (activeActivity) {
    await updateUserPendingIntent(userId, "waiting_doc_replace");
    await saveUserMsg(
      userId,
      userChannelId,
      rawContent,
      "waiting_doc_replace",
      input,
      today,
    );
    const reply = formatActivityReplacePrompt(
      activeActivity.title ?? "",
      MAX_ACTIVITIES_PER_DAY - activityCount,
    );
    await sendAndSaveMessage({
      channel,
      to,
      userId,
      userChannelId,
      message: reply,
      today,
    });
    return;
  }

  const savedMsg = await saveMessage({
    userId,
    userChannelId,
    role: "user",
    content: rawContent,
    intent: "free_text",
    externalId: input.externalId,
    mediaType: input.mediaType,
    mediaId: input.mediaId,
    metadata: input.mediaMetadata,
    receivedAt: input.receivedAt,
  });
  await incrementUserMessageCount(userId, today);
  await saveImageMedia(savedMsg.id, input, rawContent);
  await createPendingBuffer(
    userId,
    userChannelId,
    rawContent,
    docType,
    today,
    channel,
    to,
    savedMsg.id,
  );
}
