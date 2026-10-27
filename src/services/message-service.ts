import {
  Activity,
  DocType,
  EvalTipClass,
  Level,
  Message,
  Prisma,
  QuestionFormat,
  User,
} from "../lib/prisma";
import {
  buildAnsweredInteractive,
  parseMessage,
  resolveOptionIndex,
  resolveSelectedButtonId,
} from "../core/parser";
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
  formatSupportCanceledGuidance,
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
  formatAudioQuestionNeedsText,
  formatVoiceNoteInaudible,
  formatPracticeWaiting,
  formatDailyPracticeLimitReached,
  formatReviewUpToDate,
  formatIntensiveDailyLimitReached,
  formatOnboardingMsg1,
  formatOnboardingMsg2,
  formatOnboardingMsg3,
  formatDomainQuestion,
  formatTopicQuestion,
  formatFocusQuestion,
  formatNewActivityFlowCanceled,
  formatNewActivityFlowCanceledGuidance,
  formatSetFirstLevelCanceled,
  formatFirstNewActivityCanceled,
  formatFeedbackToSpeech,
  formatImageBlocked,
  formatImageUnreadable,
  formatGenericError,
} from "../core/formatters";
import {
  saveMessage,
  findLastUserMessage,
  findMessageByExternalId,
  findOptionListMessageById,
  findOptionListMessagesByQuestion,
  updateMessageInteractive,
} from "../repo/messages.repo";
import { createMedia } from "../repo/media.repo";
import {
  markUserOnboarded,
  updateUserPlanStatus,
  findUserById,
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
import { resolveBlockedPaymentLink } from "./stripe-checkout-service";
import {
  createDoc,
  findDocById,
  findPendingDocByUser,
  updateDoc,
} from "../repo/docs.repo";
import { createDocItem, countValidDocItemsByDoc } from "../repo/doc-items.repo";
import {
  findLastActiveActivityByUser,
  findCurrentActivityByUser,
  findActivitiesForList,
  updateActivity,
  countAllActivitiesByUser,
} from "../repo/activities.repo";
import {
  maybeSendActivitySuggestion,
  switchToActivity,
} from "./activity-service";
import { resolveFeedbackAudioMediaId } from "./feedback-audio-service";
import { linkAnswerAudio } from "./answer-audio-service";
import {
  isInaudibleTranscription,
  normalizeVoiceCommandText,
} from "../core/voice-note";
import {
  getTodayActivityCount,
  getTodayUsage,
  incrementUserMessageCount,
  incrementDailyPracticeCount,
} from "../repo/daily-usage.repo";
import {
  publishDocMerge,
  publishDocProcessing,
  publishResumeSummary,
} from "../lib/qstash";
import { sendSupportEmail } from "../vendors/email.vendor";
import { formatDateTime } from "../lib/datetime-utils";
import { generateAnswerEvaluation } from "../vendors/llm.vendor";
import { getFeedbackExamples } from "../core/format-loader";
import {
  hasAlternativeKeyInTip,
  isAnswerInKeys,
  isEvalTipClassAllowed,
} from "../core/eval-tip";
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
  countSm2EligibleQuestionsByUser,
} from "../repo/questions.repo";
import {
  formatIntensivePendingQuestion,
  formatQuestion,
  formatNumberedOptions,
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
  MEDIA_SOURCE,
  DOMAINS,
  LEVEL_OPTIONS,
  EVAL_TIP_ALTERNATIVE_FORMATS,
  AUDIO_QUESTION_FORMATS,
} from "../lib/constants";
import { sanitizeText } from "../lib/utils";
import {
  sendAndSaveMessage,
  trackChannelSends,
  waitBeforeSend,
} from "./message-sender-service";
import {
  IncomingMessage,
  MessageIntent,
  NewActivityIntentData,
  UserIntentMetadata,
} from "../types/domain";
import {
  completeRoundZero,
  generateQuestionIfPoolNotFull,
  isRoundPoolExhausted,
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

// Comandos reais que, quando a activity está com waitingUser, NÃO são coagidos
// para "free_text" (resposta de prática) e seguem para o switch como o comando
// que são. Não tem relação com estado pendente (pendingIntent): esse é sempre
// resolvido primeiro, seja qual for o intent.
const PRACTICE_ANSWER_PASSTHROUGH_INTENTS: MessageIntent[] = [
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
  rawChannel: MessageChannel,
): Promise<void> {
  const { channel, hasSent } = trackChannelSends(rawChannel);
  const rawText = (input.text ?? "").trim();
  const user = await findUserById(input.userId);
  if (!user) {
    throw new Error(`[handleIncomingMessage] user ${input.userId} not found`);
  }
  const activeActivity = await findLastActiveActivityByUser(user.id);

  const text = input.text ?? "";
  const today = startOfDay(new Date());
  const messageId = input.externalId ?? "";

  const isLocked =
    user.lastRequestAt != null &&
    (user.lastResponseAt == null || user.lastResponseAt < user.lastRequestAt) &&
    Date.now() - user.lastRequestAt.getTime() < MESSAGE_SUPPRESSION_SEC * 1000;

  if (isLocked) {
    await saveMessage({
      id: input.messageId,
      userId: user.id,
      activityId: activeActivity?.id,
      role: "user",
      content: rawText,
      intent: "ignored",
      externalId: input.externalId,
      mediaType: input.mediaType,
      mediaId: input.mediaId,
      metadata: { reason: "duplicate_within_window" },
      receivedAt: input.receivedAt,
    });
    return;
  }

  await updateUserLastRequest(user.id, messageId);

  try {
    // Audio sem fala nao chega a avaliacao: a pergunta continua pendente e
    // nenhuma chamada de LLM e gasta.
    if (input.isVoiceNote && isInaudibleTranscription(rawText)) {
      await saveUserMsg({
        userId: user.id,
        content: rawText,
        intent: "free_text",
        input,
        today,
        activityId: activeActivity?.id,
      });
      await sendAndSaveMessage({
        channel,
        userId: user.id,
        activityId: activeActivity?.id,
        message: formatVoiceNoteInaudible(),
        intent: "voice_note_inaudible",
        today,
      });
      return;
    }

    const [firstWord] = rawText.split(/\s+/);
    if (resolveCommand(firstWord) === "admin") {
      if (user.phone !== process.env.WA_SUPPORT) return;
      const reply = await handleAdminCommand(rawText, user.id, channel);
      await sendAndSaveMessage({
        channel,
        userId: user.id,
        activityId: activeActivity?.id,
        message: { text: reply },
        today,
      });
      return;
    }

    if (
      user.pendingIntent === "waiting_admin_send_message" &&
      user.phone === process.env.WA_SUPPORT
    ) {
      const reply = await handleAdminPendingSendMessage(user, channel, rawText);
      await sendAndSaveMessage({
        channel,
        userId: user.id,
        activityId: activeActivity?.id,
        message: { text: reply },
        today,
      });
      return;
    }

    // ─── Verificação de acesso ────────────────────────────────────────────────
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

    // Mesma deteccao de comando do texto digitado; na voz so as pontas da
    // transcricao saem antes. O text original segue para avaliacao e historico.
    const parsed = parseMessage(
      input.isVoiceNote ? normalizeVoiceCommandText(text) : text,
      { isIntensiveMode },
    );
    const pendingIntent = user.pendingIntent as MessageIntent | undefined;

    // ─── Verificação de plano expirado ───────────────────────────────────────

    if (!canPractice(user)) {
      if (pendingIntent === "support") {
        if (parsed.intent === "cancel" || parsed.intent === "cancel_no") {
          await updateUserPendingIntent(user.id, null);
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "cancel",
            input,
            today,
          });
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity?.id,
            message: formatCanceled(),
            today,
          });
          await waitBeforeSend(
            channel,
            user.id,
            DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
            { replyToMessageId: messageId },
          );
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity?.id,
            message: formatSupportCanceledGuidance(),
            today,
          });
          return;
        }
        await notifySupportRequest(user, text);
        await updateUserPendingIntent(user.id, null);
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "free_text",
          input,
          today,
        });
        const supportReply = formatSupportReceived();
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: supportReply,
          today,
        });
        return;
      }
      if (
        parsed.intent === "list_commands" ||
        parsed.intent === "unknown_command"
      ) {
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "list_commands",
          input,
          today,
        });
        const cmdReply = formatCommandList(user.level ?? null);
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: cmdReply,
          today,
        });
        return;
      }

      if (parsed.intent === "list_activities") {
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "list_activities",
          input,
          today,
        });
        const activities = await findActivitiesForList(user.id);
        const activitiesReply = formatActivitiesList(activities);
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: activitiesReply,
          today,
        });
        return;
      }

      if (parsed.intent === "support") {
        await updateUserPendingIntent(user.id, "support");
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "support",
          input,
          today,
        });
        const supportPrompt = formatSupportRequest();
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: supportPrompt,
          today,
        });
        return;
      }

      if (parsed.intent === "cancel" || parsed.intent === "cancel_no") {
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "cancel",
          input,
          today,
        });
        const cancelReply = formatCanceled();
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: cancelReply,
          today,
        });
        return;
      }

      await saveUserMsg({
        userId: user.id,
        activityId: activeActivity?.id,
        content: text,
        intent: "free_text",
        input,
        today,
      });
      const paymentUrl = await resolveBlockedPaymentLink(user.id);
      const expiredReply = formatPlanExpired(user.planCode, paymentUrl);
      await sendAndSaveMessage({
        channel,
        userId: user.id,
        activityId: activeActivity?.id,
        message: expiredReply,
        today,
      });
      return;
    }

    // ─── Onboarding ──────────────────────────────────────────────────────────

    if (!user.onboardedAt) {
      await saveUserMsg({
        userId: user.id,
        activityId: activeActivity?.id,
        content: text,
        intent: "free_text",
        input,
        today,
      });
      await runOnboardingAndFirstActivityFlow(
        user,
        today,
        channel,
        activeActivity?.id,
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
      await saveUserMsg({
        userId: user.id,
        activityId: activeActivity?.id,
        content: String(input.mediaMetadata.statusMessage ?? ""),
        intent,
        input,
        today,
      });
      const reply =
        input.mediaMetadata.status === "blocked"
          ? formatImageBlocked()
          : formatImageUnreadable();
      await sendAndSaveMessage({
        channel,
        userId: user.id,
        activityId: activeActivity?.id,
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
        text,
        docType,
        today,
        input,
        channel,
        activeActivity,
      );
      return;
    }

    // ─── Estado pendente ──────────────────────────────────────────────────────

    if (
      (pendingIntent === "waiting_set_activity_domain" ||
        pendingIntent === "waiting_set_activity_topic" ||
        pendingIntent === "waiting_set_activity_focus") &&
      (parsed.intent === "cancel" || parsed.intent === "cancel_no")
    ) {
      await updateUserPendingIntent(user.id, null);
      await saveUserMsg({
        userId: user.id,
        activityId: activeActivity?.id,
        content: text,
        intent: "cancel",
        input,
        today,
      });
      const flowCancelledReply = formatNewActivityFlowCanceled(
        Boolean(activeActivity),
      );
      await sendAndSaveMessage({
        channel,
        userId: user.id,
        activityId: activeActivity?.id,
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
      await waitBeforeSend(
        channel,
        user.id,
        DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
        { replyToMessageId: messageId },
      );
      await sendAndSaveMessage({
        channel,
        userId: user.id,
        activityId: activeActivity?.id,
        message: guidanceReply,
        today,
      });
      return;
    }

    if (
      pendingIntent === "waiting_set_level" &&
      (parsed.intent === "cancel" || parsed.intent === "cancel_no")
    ) {
      await updateUserPendingIntent(user.id, null);
      await saveUserMsg({
        userId: user.id,
        activityId: activeActivity?.id,
        content: text,
        intent: "cancel",
        input,
        today,
      });
      const pendingDocForLevel = await findPendingDocByUser(user.id);
      if (pendingDocForLevel) {
        await updateDoc(pendingDocForLevel.id, user.id, { status: "canceled" });
      }
      const cancelledReply = formatNewActivityFlowCanceled();
      await sendAndSaveMessage({
        channel,
        userId: user.id,
        activityId: activeActivity?.id,
        message: cancelledReply,
        today,
      });

      if (user.level === null) {
        const guidanceReply = formatSetFirstLevelCanceled();
        await waitBeforeSend(
          channel,
          user.id,
          DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
          { replyToMessageId: messageId },
        );
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: guidanceReply,
          today,
        });
      }
      return;
    }

    // Enquanto há um fluxo de captura pendente, a mensagem é dele: nenhum comando
    // fura o fluxo. Só `cancelar` sai (tratado nos pré-gates acima e em cada
    // branch abaixo).
    if (pendingIntent) {
      // Aguardando captura de nível
      if (pendingIntent === "waiting_set_level") {
        if (parsed.intent === "set_level") {
          // nivel durante captura em andamento: reenviar pergunta
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "waiting_set_level",
            input,
            today,
          });
          const levelMsg = formatLevelQuestion();
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity?.id,
            message: levelMsg,
            today,
          });
          return;
        }

        const levelIndex = await applyCaptureStepSelection({
          userId: user.id,
          input,
          expectedLabels: LEVEL_OPTIONS.map((o) => o.label),
        });
        const { outcome, message } = await processLevelResponse(
          levelIndex !== null ? LEVEL_OPTIONS[levelIndex].label : text,
          user.id,
        );
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message,
          today,
        });

        if (outcome === "captured") {
          const levelFlowData = getIntentData(user);
          if (levelFlowData?.flow === "new_activity") {
            await waitBeforeSend(
              channel,
              user.id,
              DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
              { replyToMessageId: messageId },
            );
            await sendDomainQuestion(
              user.id,
              today,
              channel,
              activeActivity?.id,
            );
            await saveUserMsg({
              userId: user.id,
              activityId: activeActivity?.id,
              content: text,
              intent: "waiting_set_activity_domain",
              input,
              today,
            });
            return;
          }

          await updateUserPendingIntent(user.id, null);
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "free_text",
            input,
            today,
          });
          const pendingDocToResume = await findPendingDocByUser(user.id);
          if (pendingDocToResume) {
            await publishDocProcessing(pendingDocToResume.id, user.id);
          }
          return;
        }

        const levelIntent: MessageIntent =
          outcome === "invalid" ? "waiting_set_level" : "free_text";
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: levelIntent,
          input,
          today,
        });
        return;
      }

      // Aguardando escolha de objetivo (domain)
      if (pendingIntent === "waiting_set_activity_domain") {
        const domainIndex = await applyCaptureStepSelection({
          userId: user.id,
          input,
          expectedLabels: DOMAINS.map((d) => d.label),
        });
        const result = processDomainResponse(
          domainIndex !== null ? String(domainIndex + 1) : text,
        );
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: result.message,
          today,
        });

        if (result.outcome === "canceled") {
          await updateUserPendingIntent(user.id, null);
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "cancel",
            input,
            today,
          });
          return;
        }
        if (result.outcome === "invalid") {
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "waiting_set_activity_domain",
            input,
            today,
          });
          return;
        }

        const topicData: NewActivityIntentData = {
          flow: "new_activity",
          domain: result.domain,
          topics: result.topics,
        };
        await updateUserPendingIntent(
          user.id,
          "waiting_set_activity_topic",
          topicData,
        );
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "waiting_set_activity_topic",
          input,
          today,
        });
        return;
      }

      // Aguardando tema livre (topic)
      if (pendingIntent === "waiting_set_activity_topic") {
        const flowData = getIntentData(user);
        const domain = flowData?.domain;
        const topics = flowData?.topics;
        const userLevel = user.level;

        if (!userLevel || !domain || !topics) {
          // não deveria acontecer: nível e objetivo são sempre capturados antes deste passo
          await updateUserPendingIntent(user.id, null);
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "free_text",
            input,
            today,
          });
          const errReply = formatNewActivityFlowCanceled();
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity?.id,
            message: errReply,
            today,
          });
          return;
        }

        if (parsed.intent !== "free_text") {
          // comando no meio da captura de tema: repete a pergunta sem validar
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "waiting_set_activity_topic",
            input,
            today,
          });
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity?.id,
            message: formatTopicQuestion(topics),
            today,
          });
          return;
        }

        const topicIndex = await applyCaptureStepSelection({
          userId: user.id,
          input,
          expectedLabels: topics,
        });
        const result = await processTopicResponse(
          topicIndex !== null ? String(topicIndex + 1) : text,
          user.id,
          userLevel,
          domain,
          topics,
          channel,
          messageId,
        );

        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: result.message,
          today,
        });

        if (result.outcome !== "captured") {
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "waiting_set_activity_topic",
            input,
            today,
          });
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
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "waiting_set_activity_focus",
          input,
          today,
        });
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
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "free_text",
            input,
            today,
          });
          const errReply = formatNewActivityFlowCanceled();
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity?.id,
            message: errReply,
            today,
          });
          return;
        }

        if (parsed.intent !== "free_text") {
          // comando no meio da captura de foco: repete a pergunta sem gerar conteúdo
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "waiting_set_activity_focus",
            input,
            today,
          });
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity?.id,
            message: formatFocusQuestion(focusSuggestions),
            today,
          });
          return;
        }

        const focusIndex = await applyCaptureStepSelection({
          userId: user.id,
          input,
          expectedLabels: focusSuggestions.map((s) => s.label),
        });
        const result = await processFocusResponse(
          focusIndex !== null ? String(focusIndex + 1) : text,
          focusSuggestions,
          subtopics,
          user.id,
          userLevel,
          domain,
          topic,
          channel,
          messageId,
        );

        if (result.outcome === "done") {
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "free_text",
            input,
            today,
          });
          return;
        }

        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: result.message,
          today,
        });
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "waiting_set_activity_focus",
          input,
          today,
        });
        return;
      }

      // Aguardando sim ou não para substituir doc ativo
      if (pendingIntent === "waiting_doc_replace") {
        await updateUserPendingIntent(user.id, null);
        const lastUserMessage = await findLastUserMessage(user.id);
        if (!lastUserMessage) {
          const noPendingReply = formatNoPendingAction();
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "free_text",
            input,
            today,
          });
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity?.id,
            message: noPendingReply,
            today,
          });
          return;
        }
        if (parsed.intent === "confirm") {
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "confirm",
            input,
            today,
          });
          const mt = lastUserMessage.mediaType;
          const originalDocType: DocType =
            mt === "audio" || mt === "image" || mt === "pdf"
              ? (mt as DocType)
              : "text";
          await createPendingBuffer(
            user.id,
            lastUserMessage.content,
            originalDocType,
            today,
            channel,
            lastUserMessage.id,
            activeActivity?.id,
          );
          return;
        }

        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "cancel",
          input,
          today,
        });
        const reply = formatActivityReplaceCanceled();
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: reply,
          today,
        });
        return;
      }

      // Aguardando mensagem de suporte
      if (pendingIntent === "support") {
        if (parsed.intent === "cancel" || parsed.intent === "cancel_no") {
          await updateUserPendingIntent(user.id, null);
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity?.id,
            content: text,
            intent: "cancel",
            input,
            today,
          });
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity?.id,
            message: formatCanceled(),
            today,
          });
          await waitBeforeSend(
            channel,
            user.id,
            DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
            { replyToMessageId: messageId },
          );
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity?.id,
            message: formatSupportCanceledGuidance(),
            today,
          });
          return;
        }
        await updateUserPendingIntent(user.id, null);
        await notifySupportRequest(user, text);

        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "free_text",
          input,
          today,
        });
        const reply = formatSupportReceived();
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: reply,
          today,
        });
        return;
      }

      // pendingIntent com valor sem handler de captura (ex: waiting_admin_send_message
      // órfão após rotação de WA_SUPPORT). Limpa e segue pro fluxo normal em vez de
      // vazar o estado pendente pro switch.
      console.warn("[message-service] pendingIntent sem handler", {
        pendingIntent,
        userId: user.id,
      });
      await updateUserPendingIntent(user.id, null);
    }

    // ─── Fluxo normal ────────────────────────────────────────────────────────

    // waitingUser === true → ignora match de comando, trata como resposta de prática
    const effectiveIntent: MessageIntent =
      activeActivity?.waitingUser &&
      parsed.intent !== "free_text" &&
      !PRACTICE_ANSWER_PASSTHROUGH_INTENTS.includes(parsed.intent)
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
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "waiting_set_level",
          input,
          today,
        });
        const levelMsg = formatLevelQuestion();
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: levelMsg,
          today,
        });
        return;
      }

      case "new_activity": {
        const { nextIntent } = await startNewActivityFlow(
          user,
          today,
          channel,
          activeActivity?.id,
        );
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: nextIntent,
          input,
          today,
        });
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

        const leaving = await findCurrentActivityByUser(user.id);
        await switchToActivity(user.id, target);
        await saveUserMsg({
          userId: user.id,
          content: text,
          intent: "resume_activity",
          input,
          today,
          activityId: target.id,
        });
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: target.id,
          message: formatResumeSuccess(target.title),
          today,
        });
        try {
          await publishResumeSummary({
            userId: user.id,
            leavingActivityId:
              leaving && leaving.id !== target.id ? leaving.id : null,
            targetActivityId: target.id,
          });
        } catch (err) {
          console.error(
            "[message-service] falha ao enfileirar resumo de retomada:",
            err,
          );
        }
        return;
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
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity.id,
            content: text,
            intent: "practice_now",
            input,
            today,
          });
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity.id,
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
          // Reexibir a pergunta sem alinhar o estado da activity deixava
          // waitingUser/lastQuestionId dessincronizados: a resposta seguinte
          // caia no fallback "Aguarde". Alinha
          // antes dos envios pra fechar tambem a janela de concorrencia.
          await updateActivity(activeActivity.id, user.id, {
            waitingUser: true,
            lastQuestionId: alreadyPending.id,
            nextMessageAt: new Date(
              Date.now() + activeActivity.intervalMinutes * 60 * 1000,
            ),
          });
          await saveUserMsg({
            userId: user.id,
            activityId: activeActivity.id,
            content: text,
            intent: "practice_now",
            input,
            today,
          });
          const pendingReply = formatIntensiveModeActivated({
            isIntensiveMode,
            hasPendingQuestion: true,
          });
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity.id,
            message: pendingReply,
            today,
          });
          await waitBeforeSend(
            channel,
            user.id,
            DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
            { replyToMessageId: messageId },
          );
          const pendingQuestionMsg = formatQuestion(alreadyPending, {
            level: activeActivity.userLevel,
          });
          await sendAndSaveMessage({
            channel,
            userId: user.id,
            activityId: activeActivity.id,
            message: pendingQuestionMsg,
            intent: "practice_question",
            questionId: alreadyPending.id,
            today,
          });
          return;
        }

        const replyActivation = formatIntensiveModeActivated({
          isIntensiveMode,
        });
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity.id,
          message: replyActivation,
          today,
        });

        await waitBeforeSend(
          channel,
          user.id,
          DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
          { replyToMessageId: messageId },
        );
        await handleIntensiveNextQuestion(
          activeActivity,
          user.id,
          today,
          channel,
          true,
          messageId,
        );
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity.id,
          content: text,
          intent: "practice_now",
          input,
          today,
        });
        return;
      }

      case "pause_practice": {
        if (!activeActivity) {
          reply = formatNoActiveActivity();
          messageIntent = "free_text";
          break;
        }

        await updateActivity(activeActivity.id, user.id, {
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

        // Avalia sempre que houver pergunta pendente de fato, mesmo se
        // waitingUser tiver dessincronizado do status da pergunta (straggler
        // de conclusao de rodada, duas perguntas pendentes, ou escrita parcial
        // entre updateQuestion e updateActivity). O bloco de sucesso abaixo
        // ja auto-cura waitingUser/lastInteractionAt.
        if (activeActivity) {
          const practiceDoc = await findDocById(activeActivity.docId, user.id);
          if (practiceDoc) {
            const pendingQuestion = await findPendingQuestion(
              activeActivity.id,
            );
            if (pendingQuestion) {
              const isAudioQuestion =
                !!pendingQuestion.questionFormat &&
                AUDIO_QUESTION_FORMATS.includes(pendingQuestion.questionFormat);
              // Nos formatos de audio a resposta e escrita: nota de voz nao avalia
              // e a pergunta continua pendente.
              if (isAudioQuestion && input.isVoiceNote) {
                await saveUserMsg({
                  userId: user.id,
                  content: text,
                  intent: "free_text",
                  input,
                  today,
                  activityId: activeActivity.id,
                });
                await sendAndSaveMessage({
                  channel,
                  userId: user.id,
                  activityId: activeActivity.id,
                  message: formatAudioQuestionNeedsText(),
                  intent: "audio_answer_needs_text",
                  questionId: pendingQuestion.id,
                  today,
                });
                return;
              }

              const questionFormats = [
                pendingQuestion.questionFormat,
              ] as QuestionFormat[];

              const feedbackExamples = pendingQuestion.questionFormat
                ? getFeedbackExamples(questionFormats, activeActivity.userLevel)
                : "";

              const formattedQuestion = formatQuestion(
                {
                  question: pendingQuestion.question,
                  questionFormat: pendingQuestion.questionFormat,
                  questionOptions: pendingQuestion.questionOptions,
                  termHint: pendingQuestion.termHint,
                },
                { level: activeActivity.userLevel },
              );
              const questionForEvaluation = formattedQuestion.interactive
                ?.isOptionList
                ? formatNumberedOptions(
                    formattedQuestion.text,
                    pendingQuestion.questionOptions,
                  )
                : isAudioQuestion
                  ? `${formattedQuestion.text}\nFrase do áudio: ${pendingQuestion.question}`
                  : formattedQuestion.text;

              await channel.notifyTyping(user.id, {
                replyToMessageId: messageId,
              });
              const evaluation = await generateAnswerEvaluation({
                question: questionForEvaluation,
                answerKeys: pendingQuestion.answerKeys,
                userAnswer: text,
                attemptCount: pendingQuestion.attemptCount,
                docContent: practiceDoc.content ?? "",
                feedbackExamples: feedbackExamples,
                contentOrigin: practiceDoc.source,
                questionFormat: pendingQuestion.questionFormat ?? "",
                level: activeActivity.userLevel,
                userId: user.id,
                docId: practiceDoc.id,
                questionFormats,
              });
              const evalStatus = evaluation?.status ?? "wrong";
              const feedback = evaluation
                ? formatFeedback(evaluation, activeActivity.userLevel, {
                    format: pendingQuestion.questionFormat,
                  })
                : formatFeedbackFailed();
              // Formatos de audio nao geram audio de feedback: seria a mesma frase.
              const feedbackAudioMediaId =
                evaluation && !isAudioQuestion
                  ? await resolveFeedbackAudioMediaId(
                      evaluation,
                      pendingQuestion,
                    )
                  : null;
              const feedbackSpeechText = evaluation
                ? formatFeedbackToSpeech(evaluation)
                : null;
              const canTipOnRight =
                evaluation?.eval_tip_class === "alternative" &&
                !!pendingQuestion.questionFormat &&
                EVAL_TIP_ALTERNATIVE_FORMATS.includes(
                  pendingQuestion.questionFormat,
                ) &&
                hasAlternativeKeyInTip(
                  pendingQuestion.answerKeys,
                  text,
                  evaluation.eval_tip ?? "",
                );
              const silent =
                evaluation?.eval_tip_class === "none" ||
                evaluation?.eval_tip_class === "spelling" ||
                !isEvalTipClassAllowed(
                  pendingQuestion.questionFormat,
                  evaluation?.eval_tip_class,
                ) ||
                (evalStatus === "right" && !canTipOnRight);
              const evalTip =
                !evaluation?.user_unknown && !silent
                  ? evaluation?.eval_tip
                  : null;
              // silent já exclui "none" e "spelling"; cast seguro para o enum do banco
              const tipClass = evalTip
                ? (evaluation?.eval_tip_class as EvalTipClass)
                : null;
              const tipMsg = evalTip ? formatEvalTip(evalTip) : null;
              let tipSent = false;
              const answerType = input.isVoiceNote ? "audio" : "text";
              if (input.isVoiceNote && input.mediaId) {
                await linkAnswerAudio(pendingQuestion.id, input.mediaId);
              }
              const isWrongOrPartial =
                evalStatus === "wrong" || evalStatus === "partial";
              const isAlternativeAnswer =
                evaluation?.eval_tip_class === "alternative" &&
                !isAnswerInKeys(pendingQuestion.answerKeys, text);
              const sm2 = calcSm2(
                pendingQuestion.easeFactor,
                pendingQuestion.interval,
                pendingQuestion.nextRevisionAt,
                evalStatus,
                isAlternativeAnswer,
              );
              const isRealRevision =
                pendingQuestion.attemptCount > 0 && sm2 !== null;
              const eligibleBefore = await countSm2EligibleQuestionsByUser(
                user.id,
              );
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
                ...(evaluation
                  ? {
                      feedbackText: sanitizeText(evaluation.feedback_text),
                      feedbackTranslation: sanitizeText(
                        evaluation.feedback_translation,
                      ),
                    }
                  : {}),
                metadata: scoreMetadata,
                score: computeQuestionScore(scoreMetadata),
              });
              const hasClearedReviewQueue =
                eligibleBefore > 0 &&
                (await countSm2EligibleQuestionsByUser(user.id)) === 0;
              const reviewUpToDateParams = {
                channel,
                userId: user.id,
                activityId: activeActivity.id,
                message: formatReviewUpToDate(),
                intent: "review_up_to_date",
                today,
              };
              // Precisa rodar antes do saveUserMsg: o cliente web reconcilia a
              // selecao otimista quando a mensagem do usuario chega.
              if (
                pendingQuestion.questionFormat === QuestionFormat.choice ||
                pendingQuestion.questionFormat ===
                  QuestionFormat.image_recognition
              ) {
                await markOptionListAnswered({
                  userId: user.id,
                  questionId: pendingQuestion.id,
                  buttonId: input.buttonId,
                  answerText: text,
                });
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
                // Reagenda de cadência (§8) pausada: prática migrou para o web.
                // TODO: review
                // nextMessageAt: new Date(
                //   Date.now() + activeActivity.intervalMinutes * 60 * 1000,
                // ),
              });
              await saveUserMsg({
                userId: user.id,
                content: text,
                intent: "free_text",
                input,
                today,
                activityId: activeActivity.id,
              });
              await sendAndSaveMessage({
                channel,
                userId: user.id,
                activityId: activeActivity.id,
                message: feedback,
                intent: "practice_feedback",
                questionId: pendingQuestion.id,
                today,
              });

              if (feedbackAudioMediaId) {
                await waitBeforeSend(
                  channel,
                  user.id,
                  DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
                  { replyToMessageId: messageId },
                );
                await sendAndSaveMessage({
                  channel,
                  userId: user.id,
                  activityId: activeActivity.id,
                  message: {
                    ...(feedbackSpeechText ?? feedback),
                    audioMediaId: feedbackAudioMediaId,
                  },
                  intent: "practice_feedback",
                  questionId: pendingQuestion.id,
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
                await waitBeforeSend(
                  channel,
                  user.id,
                  AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC * 1000,
                  { replyToMessageId: messageId },
                );
                if (tipMsg) {
                  await sendAndSaveMessage({
                    channel,
                    userId: user.id,
                    activityId: activeActivity.id,
                    message: tipMsg,
                    intent: "eval_tip",
                    questionId: pendingQuestion.id,
                    today,
                  });
                }
                if (hasClearedReviewQueue) {
                  await waitBeforeSend(
                    channel,
                    user.id,
                    DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
                    { replyToMessageId: messageId },
                  );
                  await sendAndSaveMessage(reviewUpToDateParams);
                  await waitBeforeSend(
                    channel,
                    user.id,
                    DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
                    { replyToMessageId: messageId },
                  );
                }
                if (
                  !activeActivity.roundCompleted &&
                  (await isRoundPoolExhausted(activeActivity))
                ) {
                  await completeRoundZero(
                    activeActivity.id,
                    user.id,
                    today,
                    activeActivity.intervalMinutes,
                    channel,
                    messageId,
                  );
                  await waitBeforeSend(
                    channel,
                    user.id,
                    AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC * 1000,
                    { replyToMessageId: messageId },
                  );
                }
                await sendAndSaveMessage({
                  channel,
                  userId: user.id,
                  activityId: activeActivity.id,
                  message: limitMsg,
                  intent: "practice_feedback",
                  today,
                });
                await maybeSendActivitySuggestion({
                  activity: activeActivity,
                  userId: user.id,
                  isLastAnswerCorrect: evalStatus === "right",
                  isIntensiveMode: Boolean(isPracticingSessionActive),
                  channel,
                  today,
                  replyToMessageId: messageId,
                });
                return;
              }

              if (isPracticingSessionActive) {
                await waitBeforeSend(
                  channel,
                  user.id,
                  AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC * 1000,
                  { replyToMessageId: messageId },
                );
                if (tipMsg) {
                  tipSent = true;
                  await sendAndSaveMessage({
                    channel,
                    userId: user.id,
                    activityId: activeActivity.id,
                    message: tipMsg,
                    intent: "eval_tip",
                    questionId: pendingQuestion.id,
                    today,
                  });
                  await waitBeforeSend(
                    channel,
                    user.id,
                    DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
                    { replyToMessageId: messageId },
                  );
                }
                if (hasClearedReviewQueue) {
                  await sendAndSaveMessage(reviewUpToDateParams);
                  await waitBeforeSend(
                    channel,
                    user.id,
                    DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
                    { replyToMessageId: messageId },
                  );
                }
                const sent = await handleIntensiveNextQuestion(
                  activeActivity,
                  user.id,
                  today,
                  channel,
                  false,
                  messageId,
                );
                if (sent) return;
              }

              if (interactionCount === 1) {
                const guideMsg = formatGuideAfterFirstFeedback();
                await waitBeforeSend(
                  channel,
                  user.id,
                  AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC * 1000,
                  { replyToMessageId: messageId },
                );
                if (tipMsg && !tipSent) {
                  await sendAndSaveMessage({
                    channel,
                    userId: user.id,
                    activityId: activeActivity.id,
                    message: tipMsg,
                    intent: "eval_tip",
                    questionId: pendingQuestion.id,
                    today,
                  });
                  await waitBeforeSend(
                    channel,
                    user.id,
                    AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC * 1000,
                    { replyToMessageId: messageId },
                  );
                }
                if (hasClearedReviewQueue) {
                  await sendAndSaveMessage(reviewUpToDateParams);
                  await waitBeforeSend(
                    channel,
                    user.id,
                    AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC * 1000,
                    { replyToMessageId: messageId },
                  );
                }
                await sendAndSaveMessage({
                  channel,
                  userId: user.id,
                  activityId: activeActivity.id,
                  message: guideMsg,
                  intent: "guide_after_first_feedback",
                  today,
                });
                return;
              }

              if (tipMsg && !tipSent) {
                await waitBeforeSend(
                  channel,
                  user.id,
                  AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC * 1000,
                  { replyToMessageId: messageId },
                );
                await sendAndSaveMessage({
                  channel,
                  userId: user.id,
                  activityId: activeActivity.id,
                  message: tipMsg,
                  intent: "eval_tip",
                  questionId: pendingQuestion.id,
                  today,
                });
              }

              if (hasClearedReviewQueue) {
                await waitBeforeSend(
                  channel,
                  user.id,
                  AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC * 1000,
                  { replyToMessageId: messageId },
                );
                await sendAndSaveMessage(reviewUpToDateParams);
              }

              if (!isIntensiveMode) {
                await maybeSendActivitySuggestion({
                  activity: activeActivity,
                  userId: user.id,
                  isLastAnswerCorrect: evalStatus === "right",
                  isIntensiveMode: Boolean(isPracticingSessionActive),
                  channel,
                  today,
                  replyToMessageId: messageId,
                });
              }

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

    await saveUserMsg({
      userId: user.id,
      activityId: activeActivity?.id,
      content: text,
      intent: messageIntent,
      input,
      today,
    });
    await sendAndSaveMessage({
      channel,
      userId: user.id,
      activityId: activeActivity?.id,
      message: reply,
      today,
    });
    return;
  } catch (err) {
    console.error("[handleIncomingMessage] falha ao processar mensagem", {
      userId: user.id,
      err,
    });
    if (!hasSent()) {
      try {
        await sendAndSaveMessage({
          channel,
          userId: user.id,
          activityId: activeActivity?.id,
          message: formatGenericError(),
        });
      } catch (sendErr) {
        console.error("[handleIncomingMessage] falha ao enviar erro generico", {
          userId: user.id,
          err: sendErr,
        });
      }
    }
  } finally {
    await updateUserLastResponse(user.id, messageId);
    // Processamento que terminou sem enviar nada (erro ou caminho mudo) pode
    // ter acendido o "digitando": apaga aqui, num ponto so.
    if (!hasSent()) await channel.notifyTypingStop(user.id);
  }
}

async function handleIntensiveNextQuestion(
  activity: Activity,
  userId: string,
  today: Date,
  channel: MessageChannel,
  skipRoundComplete = false,
  replyToMessageId?: string,
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
        executionCount,
        intervalMinutes,
        today,
        channel,
        replyToMessageId,
      );
      return true;
    }

    const unanswered = await findNextUnansweredQuestion(docId, lastId);
    if (unanswered) {
      await sendIntensiveQuestion(
        unanswered,
        activity,
        userId,
        executionCount,
        intervalMinutes,
        today,
        channel,
        replyToMessageId,
      );
      return true;
    }

    await channel.notifyTyping(userId, { replyToMessageId });
    const outcome = await generateQuestionIfPoolNotFull(activity, {
      channel,
      replyToMessageId,
    });
    if (!outcome.poolExhausted) {
      if (outcome.question) {
        await sendIntensiveQuestion(
          outcome.question,
          activity,
          userId,
          executionCount,
          intervalMinutes,
          today,
          channel,
          replyToMessageId,
        );
        return true;
      }
      const pendingMsg = formatIntensivePendingQuestion();
      await sendAndSaveMessage({
        channel,
        userId,
        activityId,
        message: pendingMsg,
        intent: "pending_question",
        today,
      });
      return true;
    }

    if (!skipRoundComplete) {
      await completeRoundZero(
        activityId,
        userId,
        today,
        intervalMinutes,
        channel,
        replyToMessageId,
      );
    }
    const next = await findNextGeneralQuestion(activityId, lastId);
    if (next) {
      await waitBeforeSend(
        channel,
        userId,
        DEFAULT_MESSAGE_INTERVAL_SEC * 1000,
        { replyToMessageId },
      );
      await sendIntensiveQuestion(
        next,
        activity,
        userId,
        executionCount,
        intervalMinutes,
        today,
        channel,
        replyToMessageId,
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
      executionCount,
      intervalMinutes,
      today,
      channel,
      replyToMessageId,
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
    questionImageMediaId?: string | null;
    questionAudioMediaId?: string | null;
  },
  activity: Activity,
  userId: string,
  executionCount: number,
  intervalMinutes: number,
  today: Date,
  channel: MessageChannel,
  replyToMessageId?: string,
): Promise<void> {
  if (executionCount === 0) {
    const startMsg = formatActivityStart(activity.title);
    await sendAndSaveMessage({
      channel,
      userId,
      activityId: activity.id,
      message: startMsg,
      intent: "activity_start",
      today,
    });
    await waitBeforeSend(channel, userId, DEFAULT_MESSAGE_INTERVAL_SEC * 1000, {
      replyToMessageId,
    });
  }

  const questionText = formatQuestion(question, { level: activity.userLevel });

  await sendAndSaveMessage({
    channel,
    userId,
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
type SaveUserMsgParams = {
  userId: string;
  content: string;
  intent: MessageIntent;
  input: Pick<
    IncomingMessage,
    | "externalId"
    | "mediaType"
    | "mediaId"
    | "mediaMetadata"
    | "receivedAt"
    | "messageId"
  >;
  today: Date;
  metadata?: Record<string, string | number | null>;
  activityId?: string;
};

async function notifySupportRequest(
  user: User,
  text: string,
): Promise<void> {
  await sendSupportEmail({
    subject: "Pedido de suporte",
    title: "Novo pedido de suporte",
    message: text,
    fields: [
      { label: "ID", value: user.id },
      { label: "Nome", value: user.name ?? "Não identificado" },
      { label: "Telefone", value: user.phone ? `+${user.phone}` : "-" },
      { label: "E-mail", value: user.email ?? "-" },
      { label: "Plano", value: user.planCode === "pro" ? "Pro" : "Trial" },
      {
        label: "Expira em",
        value: formatDateTime(user.planExpiresAt ?? undefined, "pt-BR"),
      },
    ],
  });
}

async function markOptionListAnswered(params: {
  userId: string;
  questionId: string;
  buttonId?: string;
  answerText: string;
}): Promise<void> {
  const messages = await findOptionListMessagesByQuestion(
    params.userId,
    params.questionId,
  );
  const target = messages
    .map((m) => ({
      id: m.id,
      interactive: m.interactive as FormattedMessage["interactive"],
    }))
    .find((m) => m.interactive && !m.interactive.disabled);
  if (!target?.interactive) return;

  const selectedId = resolveSelectedButtonId(
    target.interactive.buttons,
    params.buttonId,
    params.answerText,
  );
  await markOptionListSelection({
    userId: params.userId,
    messageId: target.id,
    interactive: target.interactive,
    selectedId,
  });
}

async function markOptionListSelection(params: {
  userId: string;
  messageId: string;
  interactive: NonNullable<FormattedMessage["interactive"]>;
  selectedId: string | null;
}): Promise<void> {
  if (params.interactive.disabled) return;
  await updateMessageInteractive(
    params.messageId,
    params.userId,
    buildAnsweredInteractive(params.interactive, params.selectedId),
  );
}

// Clique na web num passo de captura: valida a mensagem da lista, grava a
// selecao e devolve a posicao da opcao. null = segue como texto digitado.
async function applyCaptureStepSelection(params: {
  userId: string;
  input: IncomingMessage;
  expectedLabels: string[];
}): Promise<number | null> {
  const { userId, input, expectedLabels } = params;
  if (!input.buttonId || !input.buttonMessageId) return null;
  const message = await findOptionListMessageById(
    input.buttonMessageId,
    userId,
  );
  const interactive = message?.interactive as
    | FormattedMessage["interactive"]
    | undefined;
  if (!message || !interactive) return null;
  const index = resolveOptionIndex(interactive, input.buttonId, expectedLabels);
  if (index === null) return null;
  await markOptionListSelection({
    userId,
    messageId: message.id,
    interactive,
    selectedId: input.buttonId,
  });
  return index;
}

async function saveUserMsg(params: SaveUserMsgParams): Promise<Message> {
  const {
    userId,
    content,
    intent,
    input,
    today,
    metadata,
    activityId,
  } = params;
  let message: Message;
  try {
    message = await saveMessage({
      id: input.messageId,
      userId,
      role: "user",
      content,
      intent,
      externalId: input.externalId,
      mediaType: input.mediaType,
      mediaId: input.mediaId,
      metadata: metadata ?? input.mediaMetadata,
      receivedAt: input.receivedAt,
      activityId,
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      input.externalId
    ) {
      const existing = await findMessageByExternalId(input.externalId, userId);
      if (existing) return existing;
    }
    throw err;
  }
  await incrementUserMessageCount(userId, today);
  await saveImageMedia(message, input, content);
  return message;
}

async function saveImageMedia(
  message: Pick<Message, "id" | "userId">,
  input: Pick<IncomingMessage, "mediaType" | "mediaMetadata">,
  transcription: string,
): Promise<void> {
  const mediaPath = input.mediaMetadata?.mediaPath;
  if (input.mediaType !== "image" || typeof mediaPath !== "string") return;
  const mediaId = input.mediaMetadata?.mediaId;
  const format = input.mediaMetadata?.format;
  const sizeBytes = input.mediaMetadata?.sizeBytes;
  const width = input.mediaMetadata?.width;
  const height = input.mediaMetadata?.height;
  await createMedia({
    id: typeof mediaId === "string" ? mediaId : undefined,
    userId: message.userId,
    source: MEDIA_SOURCE.USER,
    parentId: message.id,
    parentType: MEDIA_PARENT_TYPE.MESSAGE,
    mediaType: "image",
    contentType: `image/${typeof format === "string" ? format : "jpeg"}`,
    mediaPath,
    mediaSize: typeof sizeBytes === "number" ? sizeBytes : 0,
    mediaTranscription: transcription,
    metadata:
      typeof width === "number" && typeof height === "number"
        ? { width, height }
        : undefined,
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
  today: Date,
  channel: MessageChannel,
  activityId?: string,
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
    userId,
    activityId,
    message: domainMsg,
    today,
  });
}

export async function startNewActivityFlow(
  user: { id: string; level: Level | null },
  today: Date,
  channel: MessageChannel,
  activityId?: string,
): Promise<{ nextIntent: MessageIntent }> {
  if (!user.level) {
    const levelFlowData: NewActivityIntentData = { flow: "new_activity" };
    await updateUserPendingIntent(user.id, "waiting_set_level", levelFlowData);
    const levelMsg = formatLevelQuestion();
    await sendAndSaveMessage({
      channel,
      userId: user.id,
      activityId,
      message: levelMsg,
      today,
    });
    return { nextIntent: "waiting_set_level" };
  }
  await sendDomainQuestion(
    user.id,
    today,
    channel,
    activityId,
  );
  return { nextIntent: "waiting_set_activity_domain" };
}

export async function runOnboardingAndFirstActivityFlow(
  user: { id: string; level: Level | null; phone: string | null },
  today: Date,
  channel: MessageChannel,
  activityId?: string,
): Promise<void> {
  try {
    if (user.phone) {
      await markWaitlistActive(user.phone);
    }
  } catch (e) {
    console.error(
      `[runOnboardingAndFirstActivityFlow] Error to mark user ${user.id} as active in waitlist`,
      e,
    );
  }

  const msgs = [
    formatOnboardingMsg1(),
    formatOnboardingMsg2(),
    formatOnboardingMsg3(),
  ];

  for (let i = 0; i < msgs.length; i++) {
    if (i > 0) {
      await waitBeforeSend(
        channel,
        user.id,
        ONBOARDING_MESSAGE_INTERVAL_SEC * 1000,
      );
    }
    await sendAndSaveMessage({
      channel,
      userId: user.id,
      activityId,
      message: msgs[i],
      today,
    });
    if (i === 0) await markUserOnboarded(user.id);
  }

  await waitBeforeSend(
    channel,
    user.id,
    ONBOARDING_MESSAGE_INTERVAL_SEC * 1000,
  );
  await startNewActivityFlow(
    user,
    today,
    channel,
    activityId,
  );
}

export async function startConversationIfNeeded(
  user: {
    id: string;
    level: Level | null;
    onboardedAt: Date | null;
    pendingIntent: string | null;
    phone: string | null;
  },
  channel: MessageChannel,
): Promise<{ started: boolean }> {
  if (user.pendingIntent) return { started: false };
  if (await findCurrentActivityByUser(user.id)) return { started: false };

  const today = startOfDay(new Date());
  if (!user.onboardedAt) {
    await runOnboardingAndFirstActivityFlow(user, today, channel);
  } else {
    await startNewActivityFlow(
      user,
      today,
      channel,
    );
  }
  return { started: true };
}

async function createPendingBuffer(
  userId: string,
  rawContent: string,
  docType: DocType,
  today: Date,
  channel: MessageChannel,
  messageId?: string,
  activityId?: string,
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
    userId,
    activityId,
    message: reply,
    today,
  });
}

async function handleDocUpload(
  userId: string,
  rawContent: string,
  docType: DocType,
  today: Date,
  input: Pick<
    IncomingMessage,
    | "externalId"
    | "mediaType"
    | "mediaId"
    | "mediaMetadata"
    | "receivedAt"
    | "messageId"
  >,
  channel: MessageChannel,
  activeActivity: Activity | null,
): Promise<void> {
  const pendingDoc = await findPendingDocByUser(userId);
  if (pendingDoc) {
    const validCount = await countValidDocItemsByDoc(pendingDoc.id);
    if (!canAddDocItem(validCount)) {
      await saveUserMsg({
        userId,
        activityId: activeActivity?.id,
        content: rawContent,
        intent: "free_text",
        input,
        today,
      });
      const reply = formatDocItemLimitReached();
      await sendAndSaveMessage({
        channel,
        userId,
        activityId: activeActivity?.id,
        message: reply,
        today,
      });
      return;
    }
    const itemValidation = validateDocItemInput(rawContent, docType);
    const savedMsg = await saveMessage({
      id: input.messageId,
      userId,
      activityId: activeActivity?.id,
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
    await saveImageMedia(savedMsg, input, rawContent);
    if (!itemValidation.success) {
      await sendAndSaveMessage({
        channel,
        userId,
        activityId: activeActivity?.id,
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
      userId,
      activityId: activeActivity?.id,
      message: reply,
      today,
    });
    return;
  }

  const activityCount = await getTodayActivityCount(userId, today);
  if (!canStartActivity(activityCount)) {
    await saveUserMsg({
      userId,
      activityId: activeActivity?.id,
      content: rawContent,
      intent: "free_text",
      input,
      today,
    });
    const reply = formatDailyActivityLimitReached();
    await sendAndSaveMessage({
      channel,
      userId,
      activityId: activeActivity?.id,
      message: reply,
      today,
    });
    return;
  }

  const itemValidation = validateDocItemInput(rawContent, docType);
  if (!itemValidation.success) {
    await saveUserMsg({
      userId,
      activityId: activeActivity?.id,
      content: rawContent,
      intent: "free_text",
      input,
      today,
    });
    await sendAndSaveMessage({
      channel,
      userId,
      activityId: activeActivity?.id,
      message: { text: itemValidation.error },
      today,
    });
    return;
  }

  if (activeActivity) {
    await updateUserPendingIntent(userId, "waiting_doc_replace");
    await saveUserMsg({
      userId,
      activityId: activeActivity.id,
      content: rawContent,
      intent: "waiting_doc_replace",
      input,
      today,
    });
    const reply = formatActivityReplacePrompt(
      activeActivity.title ?? "",
      MAX_ACTIVITIES_PER_DAY - activityCount,
    );
    await sendAndSaveMessage({
      channel,
      userId,
      activityId: activeActivity.id,
      message: reply,
      today,
    });
    return;
  }

  const savedMsg = await saveMessage({
    id: input.messageId,
    userId,
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
  await saveImageMedia(savedMsg, input, rawContent);
  await createPendingBuffer(
    userId,
    rawContent,
    docType,
    today,
    channel,
    savedMsg.id,
  );
}
