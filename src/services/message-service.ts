import {
  Activity,
  DocType,
  Level,
  Message,
  QuestionFormat,
  QuestionStatus,
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
  formatIntensiveModeStopped,
  formatGuideAfterFirstFeedback,
  formatCanceled,
  formatLevelUpdateCanceled,
  formatActivityReplaceCanceled,
  formatInvalidResumeIndex,
  formatNoActiveActivity,
  formatAllQuestionsAnswered,
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
} from "../core/formatters";
import { saveMessage, findLastUserMessage } from "../repo/messages.repo";
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
} from "../repo/activities.repo";
import { switchToActivity } from "./activity-service";
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
  findNextUnansweredQuestion,
  findNextGeneralQuestion,
  findPendingQuestion,
  updateQuestion,
  findSm2EligibleQuestion,
} from "../repo/questions.repo";
import { findSectionById, recalcSectionStatus } from "../repo/sections.repo";
import {
  formatSectionTransition,
  formatChoiceQuestion,
  formatIntensivePendingQuestion,
} from "../core/formatters";
import {
  INTENSIVE_UNTIL_MIN,
  MAX_ACTIVITIES_PER_DAY,
  AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC,
  MESSAGE_SUPPRESSION_SEC,
  ONBOARDING_MESSAGE_INTERVAL_SEC,
  DAILY_PRACTICE_LIMIT,
} from "../lib/constants";
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
import { handleAdminCommand } from "./admin-service";
import { markWaitlistActive } from "../repo/waitlist.repo";
import { startOfDay } from "date-fns";
import { validateDocItemInput } from "./doc-item-service";
import { OutMessage } from "../types/out-message";
import { MessageChannel } from "../types/message-channel";

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
  const user = await findOrCreateUserByChannel(
    input.channelType,
    input.channelId,
    input.channelCode,
    input.contactName ?? undefined,
  );
  const userChannel = user.channels.find(
    (c) => c.channelId === input.channelId,
  )!;

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
    if (/^admin(\s|$)/i.test(rawText)) {
      if (input.channelId !== process.env.WA_SUPPORT) return;
      const reply = await handleAdminCommand(rawText);
      await saveBotReply(user.id, userChannel.id, reply, today);
      await channel.sendMessage(userChannel.channelId, reply);
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
        const channelCode = userChannel.channelCode ?? userChannel.channelId;
        const planLabel = user.planCode === "pro" ? "Pro" : "Trial";
        const supportMsg = formatInternalSupportMessage(
          channelCode,
          planLabel,
          text,
        );
        if (process.env.WA_SUPPORT) {
          try {
            await sendWhatsAppMessage(process.env.WA_SUPPORT, supportMsg);
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
        await saveBotReply(user.id, userChannel.id, supportReply, today);
        await channel.sendMessage(userChannel.channelId, supportReply);
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
        await saveBotReply(user.id, userChannel.id, cmdReply, today);
        await channel.sendMessage(userChannel.channelId, cmdReply);
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
        await saveBotReply(user.id, userChannel.id, activitiesReply, today);
        await channel.sendMessage(userChannel.channelId, activitiesReply);
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
        await saveBotReply(user.id, userChannel.id, supportPrompt, today);
        await channel.sendMessage(userChannel.channelId, supportPrompt);
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
        await saveBotReply(user.id, userChannel.id, cancelReply, today);
        await channel.sendMessage(userChannel.channelId, cancelReply);
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
      const expiredReply = formatPlanExpired();
      await saveBotReply(user.id, userChannel.id, expiredReply, today);
      await channel.sendMessage(userChannel.channelId, expiredReply);
      return;
    }

    // ─── Onboarding ──────────────────────────────────────────────────────────

    if (!user.onboardedAt) {
      await markUserOnboarded(user.id);
      try {
        const normalizedPhone = userChannel.channelId.replace(/\D/g, "");
        await markWaitlistActive(normalizedPhone);
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

      const outMsgs: OutMessage[] = [];
      for (const msg of msgs) {
        await saveBotReply(user.id, userChannel.id, msg, today);
        if (outMsgs.length > 0) {
          outMsgs.push({ delay: ONBOARDING_MESSAGE_INTERVAL_SEC });
        }
        outMsgs.push(msg);
      }

      const { message: flowMessage } = await startNewActivityFlow(
        user,
        userChannel.id,
        today,
      );
      outMsgs.push({ delay: ONBOARDING_MESSAGE_INTERVAL_SEC }, flowMessage);

      await channel.sendMessage(userChannel.channelId, outMsgs);
      return;
    }

    // ─── Mídia → buffer de Doc ───────────────────────────────────────────────

    if (
      input.mediaType === "audio" ||
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
      const msgs = await handleDocUpload(
        user.id,
        userChannel.id,
        text,
        docType,
        today,
        input,
      );
      if (msgs.length > 0)
        await channel.sendMessage(userChannel.channelId, msgs);
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
      const flowCancelledReply = formatNewActivityFlowCanceled();
      await saveBotReply(user.id, userChannel.id, flowCancelledReply, today);
      await channel.sendMessage(userChannel.channelId, flowCancelledReply);
      return;
    }

    if (pendingIntent === "waiting_set_level" && parsed.intent === "cancel") {
      await updateUserPendingIntent(user.id, null);
      await saveUserMsg(user.id, userChannel.id, text, "cancel", input, today);
      const pendingDocForLevel = await findPendingDocByUser(user.id);
      if (pendingDocForLevel) {
        await updateDoc(pendingDocForLevel.id, user.id, { status: "canceled" });
      }
      const cancelledReply = formatLevelUpdateCanceled();
      await saveBotReply(user.id, userChannel.id, cancelledReply, today);
      await channel.sendMessage(userChannel.channelId, cancelledReply);
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
          await channel.sendMessage(userChannel.channelId, levelMsg);
          await saveBotReply(user.id, userChannel.id, levelMsg, today);
          return;
        }

        const { outcome, message } = await processLevelResponse(text, user.id);
        await channel.sendMessage(userChannel.channelId, message);
        await saveBotReply(user.id, userChannel.id, message, today);

        if (outcome === "captured") {
          const levelFlowData = getIntentData(user);
          if (levelFlowData?.flow === "new_activity") {
            const domainMsg = await sendDomainQuestion(
              user.id,
              userChannel.id,
              today,
            );
            await channel.sendMessage(userChannel.channelId, domainMsg);
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
        await channel.sendMessage(userChannel.channelId, result.message);
        await saveBotReply(user.id, userChannel.id, result.message, today);

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
          await saveBotReply(user.id, userChannel.id, errReply, today);
          await channel.sendMessage(userChannel.channelId, errReply);
          return;
        }

        const result = await processTopicResponse(
          text,
          user.id,
          userLevel,
          domain,
        );

        await channel.sendMessage(userChannel.channelId, result.message);
        await saveBotReply(user.id, userChannel.id, result.message, today);

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
        const userLevel = user.level;

        if (!userLevel || !domain || !topic || !focusSuggestions) {
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
          await saveBotReply(user.id, userChannel.id, errReply, today);
          await channel.sendMessage(userChannel.channelId, errReply);
          return;
        }

        const result = await processFocusResponse(
          text,
          focusSuggestions,
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

        await channel.sendMessage(userChannel.channelId, result.message);
        await saveBotReply(user.id, userChannel.id, result.message, today);
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
          await saveBotReply(user.id, userChannel.id, noPendingReply, today);
          await channel.sendMessage(userChannel.channelId, noPendingReply);
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
          const replaceMsgs = await createPendingBuffer(
            user.id,
            userChannel.id,
            lastUserMessage.content,
            originalDocType,
            today,
            lastUserMessage.id,
          );
          if (replaceMsgs.length > 0)
            await channel.sendMessage(userChannel.channelId, replaceMsgs);
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
        await saveBotReply(user.id, userChannel.id, reply, today);
        await channel.sendMessage(userChannel.channelId, reply);
        return;
      }

      // Aguardando mensagem de suporte
      if (pendingIntent === "support") {
        await updateUserPendingIntent(user.id, null);
        const channelCode = userChannel.channelCode ?? userChannel.channelId;
        const planLabel = user.planCode === "pro" ? "Pro" : "Trial";
        const supportMsg = formatInternalSupportMessage(
          channelCode,
          planLabel,
          text,
        );
        const supportNumber = process.env.WA_SUPPORT;
        if (supportNumber) {
          try {
            await sendWhatsAppMessage(supportNumber, supportMsg);
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
        await saveBotReply(user.id, userChannel.id, reply, today);
        await channel.sendMessage(userChannel.channelId, reply);
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
    let reply = "";

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
        await channel.sendMessage(userChannel.channelId, levelMsg);
        await saveBotReply(user.id, userChannel.id, levelMsg, today);
        return;
      }

      case "new_activity": {
        const { message: flowMessage, nextIntent } = await startNewActivityFlow(
          user,
          userChannel.id,
          today,
        );
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          nextIntent,
          input,
          today,
        );
        await channel.sendMessage(userChannel.channelId, flowMessage);
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
          await saveBotReply(user.id, userChannel.id, limitMsg, today);
          await channel.sendMessage(userChannel.channelId, limitMsg);
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
          await saveBotReply(user.id, userChannel.id, pendingReply, today);
          await channel.sendMessage(userChannel.channelId, pendingReply);
          return;
        }

        const replyActivation = formatIntensiveModeActivated({
          isIntensiveMode,
        });
        await saveBotReply(user.id, userChannel.id, replyActivation, today);

        const intensiveReplies = await handleIntensiveNextQuestion(
          activeActivity,
          user.id,
          userChannel.id,
          today,
        );
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "practice_now",
          input,
          today,
        );
        await channel.sendMessage(userChannel.channelId, [
          replyActivation,
          ...intensiveReplies,
        ]);
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
              const questionForEval =
                pendingQuestion.questionFormat === QuestionFormat.choice &&
                pendingQuestion.questionOptions.length > 0
                  ? formatChoiceQuestion(
                      pendingQuestion.question,
                      pendingQuestion.questionOptions,
                    )
                  : pendingQuestion.question;

              const evaluation = await generateAnswerEvaluation({
                question: questionForEval,
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
              const answerType = input.mediaType === "audio" ? "audio" : "text";
              const isWrongOrPartial =
                evalStatus === "wrong" || evalStatus === "partial";
              const sm2 = calcSm2(
                pendingQuestion.easeFactor,
                pendingQuestion.interval,
                pendingQuestion.nextRevisionAt,
                evalStatus,
              );
              await updateQuestion(pendingQuestion.id, {
                answer: text,
                status: evalStatus,
                attemptCount: pendingQuestion.attemptCount + 1,
                answerType,
                ...(pendingQuestion.attemptCount > 0
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
              });
              if (pendingQuestion.sectionId) {
                await recalcSectionStatus(pendingQuestion.sectionId);
              }
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
              await saveMessage({
                userId: user.id,
                userChannelId: userChannel.id,
                activityId: activeActivity.id,
                role: "assistant",
                content: feedback,
                intent: "practice_feedback",
                questionId: pendingQuestion.id,
              });
              await incrementAgentMessageCount(user.id, today);

              if (isIntensiveMode && !canContinueIntensive) {
                const limitMsg =
                  updatedCounts.practiceCount >= DAILY_PRACTICE_LIMIT
                    ? formatDailyPracticeLimitReached()
                    : formatIntensiveDailyLimitReached();
                await updateActivity(activeActivity.id, user.id, {
                  intensiveUntil: null,
                });
                await saveMessage({
                  userId: user.id,
                  userChannelId: userChannel.id,
                  activityId: activeActivity.id,
                  role: "assistant",
                  content: limitMsg,
                  intent: "practice_feedback",
                });
                await incrementAgentMessageCount(user.id, today);
                await channel.sendMessage(userChannel.channelId, [
                  feedback,
                  { delay: AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC },
                  limitMsg,
                ]);
                return;
              }

              if (isPracticingSessionActive) {
                const replies = await handleIntensiveNextQuestion(
                  activeActivity,
                  user.id,
                  userChannel.id,
                  today,
                );
                if (replies.length > 0) {
                  await channel.sendMessage(userChannel.channelId, [
                    feedback,
                    { delay: AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC },
                    ...replies,
                  ]);
                  return;
                }
              }

              if (interactionCount == 1) {
                const guideMsg = formatGuideAfterFirstFeedback();
                await saveMessage({
                  userId: user.id,
                  userChannelId: userChannel.id,
                  activityId: activeActivity.id,
                  role: "assistant",
                  content: guideMsg,
                  intent: "guide_after_first_feedback",
                });
                await incrementAgentMessageCount(user.id, today);
                await channel.sendMessage(userChannel.channelId, [
                  feedback,
                  { delay: AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC },
                  guideMsg,
                ]);
                return;
              }

              await channel.sendMessage(userChannel.channelId, feedback);
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
    await saveBotReply(user.id, userChannel.id, reply, today);
    await channel.sendMessage(userChannel.channelId, reply);
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
): Promise<string[]> {
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
      return sendIntensiveQuestion(
        sm2,
        activityId,
        userId,
        userChannelId,
        executionCount,
        intervalMinutes,
        today,
      );
    }

    const unanswered = await findNextUnansweredQuestion(docId, lastId);
    if (unanswered) {
      return sendIntensiveQuestion(
        unanswered,
        activityId,
        userId,
        userChannelId,
        executionCount,
        intervalMinutes,
        today,
      );
    }

    const outcome = await generateQuestionIfPoolNotFull(activity);
    if (!outcome.poolExhausted) {
      if (outcome.question) {
        return sendIntensiveQuestion(
          outcome.question,
          activityId,
          userId,
          userChannelId,
          executionCount,
          intervalMinutes,
          today,
        );
      }
      const pendingMsg = formatIntensivePendingQuestion();
      await saveMessage({
        userId,
        userChannelId,
        activityId,
        role: "assistant",
        content: pendingMsg,
        intent: "pending_question",
      });
      await incrementAgentMessageCount(userId, today);
      return [pendingMsg];
    }

    const completionMsg = await completeRoundZero(
      activityId,
      userId,
      today,
      userChannelId,
      intervalMinutes,
    );
    const next = await findNextGeneralQuestion(activityId, lastId);
    if (next) {
      const nextReplies = await sendIntensiveQuestion(
        next,
        activityId,
        userId,
        userChannelId,
        executionCount,
        intervalMinutes,
        today,
      );
      return [completionMsg, ...nextReplies];
    }
    return [completionMsg];
  }

  const next = await findNextGeneralQuestion(activityId, lastId);
  if (next)
    return sendIntensiveQuestion(
      next,
      activityId,
      userId,
      userChannelId,
      executionCount,
      intervalMinutes,
      today,
    );
  return [];
}

async function sendIntensiveQuestion(
  question: {
    id: string;
    question: string;
    sectionId: string | null;
    questionFormat: QuestionFormat | null;
    questionOptions: string[];
  },
  activityId: string,
  userId: string,
  userChannelId: string,
  executionCount: number,
  intervalMinutes: number,
  today: Date,
): Promise<string[]> {
  const messages: string[] = [];

  if (question.sectionId) {
    const section = await findSectionById(question.sectionId);
    if (section?.status === null) {
      const transitionMsg = formatSectionTransition(
        section.title,
        executionCount === 0,
      );
      await saveMessage({
        userId,
        userChannelId,
        activityId,
        role: "assistant",
        content: transitionMsg,
        intent: "section_transition",
      });
      await incrementAgentMessageCount(userId, today);
      messages.push(transitionMsg);
    }
  }

  const questionText =
    question.questionFormat === QuestionFormat.choice &&
    question.questionOptions.length > 0
      ? formatChoiceQuestion(question.question, question.questionOptions)
      : question.question;

  await saveMessage({
    userId,
    userChannelId,
    activityId,
    role: "assistant",
    content: questionText,
    intent: "practice_question",
    questionId: question.id,
  });
  await incrementAgentMessageCount(userId, today);
  await updateQuestion(question.id, { status: "pending", activityId });
  await updateActivity(activityId, userId, {
    waitingUser: true,
    executionCount: executionCount + 1,
    lastQuestionId: question.id,
    nextMessageAt: new Date(Date.now() + intervalMinutes * 60 * 1000),
    intensiveUntil: new Date(Date.now() + INTENSIVE_UNTIL_MIN * 60 * 1000),
  });
  messages.push(questionText);
  return messages;
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
  return message;
}

async function saveBotReply(
  userId: string,
  userChannelId: string,
  content: string,
  today: Date,
): Promise<void> {
  await saveMessage({ userId, userChannelId, role: "assistant", content });
  await incrementAgentMessageCount(userId, today);
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
): Promise<string> {
  const domainData: NewActivityIntentData = { flow: "new_activity" };
  await updateUserPendingIntent(
    userId,
    "waiting_set_activity_domain",
    domainData,
  );
  const domainMsg = formatDomainQuestion();
  await saveBotReply(userId, userChannelId, domainMsg, today);
  return domainMsg;
}

async function startNewActivityFlow(
  user: { id: string; level: Level | null },
  userChannelId: string,
  today: Date,
): Promise<{ message: string; nextIntent: MessageIntent }> {
  if (!user.level) {
    const levelFlowData: NewActivityIntentData = { flow: "new_activity" };
    await updateUserPendingIntent(user.id, "waiting_set_level", levelFlowData);
    const levelMsg = formatLevelQuestion();
    await saveBotReply(user.id, userChannelId, levelMsg, today);
    return { message: levelMsg, nextIntent: "waiting_set_level" };
  }
  const domainMsg = await sendDomainQuestion(user.id, userChannelId, today);
  return { message: domainMsg, nextIntent: "waiting_set_activity_domain" };
}

async function createPendingBuffer(
  userId: string,
  userChannelId: string,
  rawContent: string,
  docType: DocType,
  today: Date,
  messageId?: string,
): Promise<string[]> {
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
  await saveBotReply(userId, userChannelId, reply, today);
  return [reply];
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
): Promise<string[]> {
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
      await saveBotReply(userId, userChannelId, reply, today);
      return [reply];
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
    if (!itemValidation.success) {
      await saveBotReply(userId, userChannelId, itemValidation.error, today);
      return [itemValidation.error];
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
    await saveBotReply(userId, userChannelId, reply, today);
    return [reply];
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
    await saveBotReply(userId, userChannelId, reply, today);
    return [reply];
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
    await saveBotReply(userId, userChannelId, itemValidation.error, today);
    return [itemValidation.error];
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
    await saveBotReply(userId, userChannelId, reply, today);
    return [reply];
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
  return createPendingBuffer(
    userId,
    userChannelId,
    rawContent,
    docType,
    today,
    savedMsg.id,
  );
}
