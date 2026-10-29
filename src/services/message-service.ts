import {
  Activity,
  EvalTipClass,
  Message,
  Prisma,
  QuestionFormat,
  User,
} from "../lib/prisma";
import {
  buildAnsweredInteractive,
  parseMessage,
  resolveSelectedButtonId,
} from "../core/parser";
import { canPractice } from "../core/access";
import {
  canPracticeToday,
} from "../core/limits";
import {
  formatCommandList,
  formatActivitiesList,
  selectArchivedActivities,
  formatPauseSuccess,
  formatNoPausableDocs,
  formatResumeSuccess,
  formatNoPausedDocs,
  formatPlanExpired,
  formatNoActivity,
  formatIntensiveModeActivated,
  formatFeedback,
  formatEvalTip,
  formatIntensiveModeStopped,
  formatGuideAfterFirstFeedback,
  formatCanceled,
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
  formatCreateActivityPrompt,
  formatActivityCreationInProgress,
  formatDailyActivityLimitReached,
  formatFeedbackToSpeech,
  formatGenericError,
} from "../core/formatters";
import {
  saveMessage,
  findMessageByExternalId,
  findOptionListMessagesByQuestion,
  updateMessageInteractive,
} from "../repo/messages.repo";
import {
  markUserOnboarded,
  updateUserPlanStatus,
  findUserById,
  updateUserPendingIntent,
  updateUserLastRequest,
  updateUserLastResponse,
} from "../repo/users.repo";
import { resolveBlockedPaymentLink } from "./stripe-checkout-service";
import {
  findDocById,
  findPendingDocByUser,
  updateDoc,
} from "../repo/docs.repo";
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
  getTodayUsage,
  incrementUserMessageCount,
  incrementDailyPracticeCount,
} from "../repo/daily-usage.repo";
import {
  publishResumeSummary,
} from "../lib/qstash";
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
  AFTER_FEEDBACK_MESSAGE_INTERVAL_SEC,
  MESSAGE_SUPPRESSION_SEC,
  ONBOARDING_MESSAGE_INTERVAL_SEC,
  DAILY_PRACTICE_LIMIT,
  DEFAULT_MESSAGE_INTERVAL_SEC,
  EVAL_TIP_ALTERNATIVE_FORMATS,
  AUDIO_QUESTION_FORMATS,
  RETRY_NEW_ACTIVITY_BUTTON_ID,
} from "../lib/constants";
import {
  createTextActivity,
  prepareActivityRetry,
} from "./new-activity-service";
import { sanitizeText } from "../lib/utils";
import {
  sendAndSaveMessage,
  sendCommand,
  trackChannelSends,
  waitBeforeSend,
} from "./message-sender-service";
import {
  IncomingMessage,
  MessageIntent,
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
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "support",
          input,
          today,
        });
        await sendOpenCommand(user.id, "open_support", input.externalId);
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

    // ─── Estado pendente ──────────────────────────────────────────────────────

    // Nenhum fluxo do chat deixa estado pendente (suporte e nivel sao modais).
    // Valor que sobrou (ex: support/waiting_set_level de versao anterior ou
    // waiting_admin_send_message orfao apos rotacao de WA_SUPPORT) e limpo e a
    // mensagem segue pro fluxo normal.
    if (pendingIntent) {
      console.warn("[message-service] pendingIntent sem handler", {
        pendingIntent,
        userId: user.id,
      });
      await updateUserPendingIntent(user.id, null);
    }

    // ─── Fluxo normal ────────────────────────────────────────────────────────

    if (input.buttonId === RETRY_NEW_ACTIVITY_BUTTON_ID) {
      await retryActivityCreation({
        user,
        input,
        text,
        today,
        channel,
        activityId: activeActivity?.id,
      });
      return;
    }

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

      // Sem balao de resposta: a mensagem de comando abre a modal na web.
      case "set_level": {
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "set_level",
          input,
          today,
        });
        await sendOpenCommand(user.id, "open_level", input.externalId);
        return;
      }
      case "new_activity": {
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "new_activity",
          input,
          today,
        });
        await sendOpenCommand(user.id, "open_create_activity", input.externalId);
        return;
      }

      case "support": {
        await saveUserMsg({
          userId: user.id,
          activityId: activeActivity?.id,
          content: text,
          intent: "support",
          input,
          today,
        });
        await sendOpenCommand(user.id, "open_support", input.externalId);
        return;
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
  return message;
}

export async function runOnboardingAndFirstActivityFlow(
  user: { id: string; phone: string | null },
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
    formatCreateActivityPrompt(true),
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
}

// "Tentar de novo" da falha de criacao: repete o ultimo pedido da modal.
// Sem pedido guardado, responde como o comando nova atividade (abre a modal).
async function retryActivityCreation(params: {
  user: Pick<User, "id" | "planStatus" | "planExpiresAt">;
  input: IncomingMessage;
  text: string;
  today: Date;
  channel: MessageChannel;
  activityId?: string;
}): Promise<void> {
  const { user, input, text, today, channel, activityId } = params;
  await saveUserMsg({
    userId: user.id,
    activityId,
    content: text,
    intent: "new_activity",
    input,
    today,
  });
  const outcome = await prepareActivityRetry(user);
  if (outcome?.status === "created") {
    await createTextActivity(user.id, outcome.request, channel);
    return;
  }
  if (outcome?.status === "daily_limit" || outcome?.status === "already_creating") {
    const message =
      outcome.status === "daily_limit"
        ? formatDailyActivityLimitReached()
        : formatActivityCreationInProgress();
    await sendAndSaveMessage({ channel, userId: user.id, activityId, message, today });
    return;
  }
  await sendOpenCommand(user.id, "open_create_activity", input.externalId);
}

async function sendOpenCommand(
  userId: string,
  action: "open_create_activity" | "open_support" | "open_level",
  replyTo: string | undefined,
): Promise<void> {
  await sendCommand({
    userId,
    command: { action, payload: {}, replyTo: replyTo ?? null },
  });
}

export async function startConversationIfNeeded(
  user: {
    id: string;
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
    const activityCount = await countAllActivitiesByUser(user.id);
    await sendAndSaveMessage({
      channel,
      userId: user.id,
      message: formatCreateActivityPrompt(activityCount === 0),
      today,
    });
  }
  return { started: true };
}

