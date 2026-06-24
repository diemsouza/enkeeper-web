import { DocType, QuestionFormat, QuestionStatus } from "../lib/prisma";
import { parseMessage } from "../core/parser";
import { canPractice } from "../core/access";
import { canStartActivity, canAddDocItem } from "../core/limits";
import {
  formatCommandList,
  formatDocsList,
  formatDocConfirmPrompt,
  formatDocReplacePrompt,
  formatPausePrompt,
  formatPauseSuccess,
  formatNoPausableDocs,
  formatResumePrompt,
  formatResumeSuccess,
  formatNoPausedDocs,
  formatPlanExpired,
  formatSupportRequest,
  formatSupportReceived,
  formatDailyActivityLimitReached,
  formatDocItemReceived,
  formatDocItemLimitReached,
  formatNoDocs,
  formatIntensiveModeActivated,
  formatOnboardingMsg1,
  formatOnboardingMsg2,
  formatOnboardingMsg3,
  formatOnboardingMsg4,
  humanizeFeedback,
} from "../core/formatters";
import { saveMessage, findLastUserMessage } from "../repo/messages.repo";
import {
  markUserOnboarded,
  updateUserPlanStatus,
  updateUserName,
} from "../repo/users.repo";
import { findOrCreateUserByChannel } from "./user-service";
import {
  createDoc,
  findDocById,
  findDocsByUser,
  findActiveDocsByUser,
  findActiveOrPausedDocsByUser,
  findPendingDocByUser,
  updateDoc,
} from "../repo/docs.repo";
import { createDocItem, countValidDocItemsByDoc } from "../repo/doc-items.repo";
import {
  findActiveActivitiesByUser,
  findActivitiesForDocsList,
  pauseActivitiesByDoc,
  resumeActivitiesByDoc,
  updateActivity,
} from "../repo/activities.repo";
import { archiveOrCancelActivitiesByDoc } from "./activity-service";
import {
  getTodayActivityCount,
  incrementUserMessageCount,
  incrementAgentMessageCount,
} from "../repo/daily-usage.repo";
import { publishDocMerge } from "../lib/qstash";
import { sendWhatsAppMessage } from "../vendors/whatsapp.vendor";
import { generateAnswerEvaluation } from "../vendors/llm.vendor";
import { getFeedbackExamples } from "../core/format-loader";
import { calcSm2 } from "../core/sm2";
import {
  findNextUnansweredQuestion,
  findNextGeneralQuestion,
  findSm2EligibleQuestion,
  hasWrongOrPartial,
  findPendingQuestion,
  updateQuestion,
} from "../repo/questions.repo";
import { findSectionById, recalcSectionStatus } from "../repo/sections.repo";
import {
  formatSectionTransition,
  formatChoiceQuestion,
} from "../core/formatters";
import {
  MIN_DOC_CHARS,
  INTENSIVE_UNTIL_MIN,
  MAX_ACTIVITIES_PER_DAY,
} from "../lib/constants";
import { IncomingMessage, MessageIntent } from "../types/domain";
import { completeRoundZero } from "./activity-cron.service";
import { handleAdminCommand } from "./admin-service";
import { markWaitlistActive } from "../repo/waitlist.repo";
import { startOfDay } from "date-fns";
import { validateDocItemInput } from "./doc-item-service";

const OVERRIDING_INTENTS: MessageIntent[] = [
  "list_commands",
  "list_docs",
  "support",
  "pause_doc",
  "resume_doc",
  "unknown_command",
  "cancel",
  "practice_now",
];

export async function handleIncomingMessage(
  input: IncomingMessage,
): Promise<string[]> {
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

  if (/^admin(\s|$)/i.test(rawText)) {
    if (input.channelId !== process.env.WA_SUPPORT) return [];
    const reply = await handleAdminCommand(rawText);
    await saveBotReply(user.id, userChannel.id, reply, today);
    return [reply];
  }

  // Atualiza nome do usuário se veio pelo canal e ainda não está salvo
  if (input.contactName && !user.name) {
    await updateUserName(user.id, input.contactName);
  }

  // ─── Verificação de acesso ────────────────────────────────────────────────

  if (
    user.planStatus === "active" &&
    user.planExpiresAt &&
    user.planExpiresAt < new Date()
  ) {
    // TODO: refactory - mover para rotina diária de cron
    await updateUserPlanStatus(user.id, "expired");
    user.planStatus = "expired";
  }

  const parsed = parseMessage(text);
  const lastUserMessage = await findLastUserMessage(user.id);
  const pendingIntent = lastUserMessage?.intent as MessageIntent | undefined;

  // ─── Verificação de plano expirado ───────────────────────────────────────

  if (!canPractice(user)) {
    if (
      pendingIntent === "support" &&
      parsed.intent !== "cancel" &&
      parsed.intent !== "cancel_no"
    ) {
      const channelCode = userChannel.channelCode ?? userChannel.channelId;
      const planLabel = user.planCode === "pro" ? "Pro" : "Trial";
      const supportMsg = `*Suporte*\n\nUsuário: ${channelCode}\nPlano: ${planLabel}\nMensagem: "${text}"`;
      if (process.env.WA_SUPPORT) {
        await sendWhatsAppMessage(process.env.WA_SUPPORT, supportMsg);
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
      return [supportReply];
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
      const cmdReply = formatCommandList();
      await saveBotReply(user.id, userChannel.id, cmdReply, today);
      return [cmdReply];
    }
    if (parsed.intent === "list_docs") {
      await saveUserMsg(
        user.id,
        userChannel.id,
        text,
        "list_docs",
        input,
        today,
      );
      const activities = await findActivitiesForDocsList(user.id);
      const docsReply = formatDocsList(activities);
      await saveBotReply(user.id, userChannel.id, docsReply, today);
      return [docsReply];
    }
    if (parsed.intent === "support") {
      await saveUserMsg(user.id, userChannel.id, text, "support", input, today);
      const supportPrompt = formatSupportRequest();
      await saveBotReply(user.id, userChannel.id, supportPrompt, today);
      return [supportPrompt];
    }
    if (parsed.intent === "cancel" || parsed.intent === "cancel_no") {
      await saveUserMsg(user.id, userChannel.id, text, "cancel", input, today);
      const cancelReply = "Cancelado.";
      await saveBotReply(user.id, userChannel.id, cancelReply, today);
      return [cancelReply];
    }
    await saveUserMsg(user.id, userChannel.id, text, "free_text", input, today);
    const expiredReply = formatPlanExpired();
    await saveBotReply(user.id, userChannel.id, expiredReply, today);
    return [expiredReply];
  }

  // ─── Onboarding ──────────────────────────────────────────────────────────

  if (!user.onboardedAt) {
    await markUserOnboarded(user.id);
    try {
      const normalizedPhone = userChannel.channelId.replace(/\D/g, "");
      await markWaitlistActive(normalizedPhone);
    } catch {
      // non-blocking
    }
    await saveUserMsg(user.id, userChannel.id, text, "free_text", input, today);
    const msgs = [
      formatOnboardingMsg1(),
      formatOnboardingMsg2(),
      formatOnboardingMsg3(),
      formatOnboardingMsg4(),
    ];
    for (const msg of msgs) {
      await saveBotReply(user.id, userChannel.id, msg, today);
    }
    return msgs;
  }

  // ─── Mídia → buffer de Doc ───────────────────────────────────────────────

  if (
    input.mediaType === "audio" ||
    input.mediaType === "image" ||
    input.mediaType === "pdf" ||
    input.mediaType === "text"
  ) {
    const docType = input.mediaType as DocType;
    return handleDocUpload(
      user.id,
      userChannel.id,
      text,
      docType,
      today,
      input,
    );
  }

  // ─── Estado pendente ──────────────────────────────────────────────────────

  const isOverriding = OVERRIDING_INTENTS.includes(parsed.intent);

  if (pendingIntent && !isOverriding) {
    // Aguardando sim ou não após texto longo
    if (pendingIntent === "awaiting_doc_confirm") {
      if (parsed.intent === "confirm") {
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "confirm",
          input,
          today,
        );
        return createPendingBuffer(
          user.id,
          userChannel.id,
          lastUserMessage!.content,
          "text",
          today,
          lastUserMessage!.id,
        );
      }
      await saveUserMsg(user.id, userChannel.id, text, "cancel", input, today);
      const reply = "Cancelado.";
      await saveBotReply(user.id, userChannel.id, reply, today);
      return [reply];
    }

    // Aguardando sim ou não para substituir doc ativo
    if (pendingIntent === "awaiting_doc_replace") {
      if (parsed.intent === "confirm") {
        await saveUserMsg(
          user.id,
          userChannel.id,
          text,
          "confirm",
          input,
          today,
        );
        const mt = lastUserMessage!.mediaType;
        const originalDocType: DocType =
          mt === "audio" || mt === "image" || mt === "pdf"
            ? (mt as DocType)
            : "text";
        return createPendingBuffer(
          user.id,
          userChannel.id,
          lastUserMessage!.content,
          originalDocType,
          today,
          lastUserMessage!.id,
        );
      }
      await saveUserMsg(user.id, userChannel.id, text, "cancel", input, today);
      const reply = "Ok, mantive o conteúdo atual.";
      await saveBotReply(user.id, userChannel.id, reply, today);
      return [reply];
    }

    // Aguardando número para pausar
    if (pendingIntent === "awaiting_pause_select") {
      await saveUserMsg(
        user.id,
        userChannel.id,
        text,
        "free_text",
        input,
        today,
      );
      if (parsed.intent === "cancel" || parsed.intent === "cancel_no") {
        const reply = "Cancelado.";
        await saveBotReply(user.id, userChannel.id, reply, today);
        return [reply];
      }
      const idx = parseInt(text.trim(), 10);
      const activeDocs = await findActiveDocsByUser(user.id);
      const doc = isNaN(idx) ? null : activeDocs[idx - 1];
      const reply = doc
        ? await (async () => {
            await updateDoc(doc.id, user.id, { status: "paused" });
            await pauseActivitiesByDoc(doc.id, user.id);
            return formatPauseSuccess();
          })()
        : "Número inválido. Use pausar para ver seus conteúdos ativos.";
      await saveBotReply(user.id, userChannel.id, reply, today);
      return [reply];
    }

    // Aguardando número para retomar
    if (pendingIntent === "awaiting_resume_select") {
      await saveUserMsg(
        user.id,
        userChannel.id,
        text,
        "free_text",
        input,
        today,
      );
      if (parsed.intent === "cancel" || parsed.intent === "cancel_no") {
        const reply = "Cancelado.";
        await saveBotReply(user.id, userChannel.id, reply, today);
        return [reply];
      }
      const idx = parseInt(text.trim(), 10);
      const allDocs = await findDocsByUser(user.id);
      const pausedDocs = allDocs.filter((d) => d.status === "paused");
      const doc = isNaN(idx) ? null : pausedDocs[idx - 1];
      const reply = doc
        ? await (async () => {
            await updateDoc(doc.id, user.id, { status: "active" });
            await resumeActivitiesByDoc(doc.id, user.id);
            const others = await findActiveOrPausedDocsByUser(user.id);
            for (const other of others) {
              if (other.id !== doc.id) {
                await updateDoc(other.id, user.id, { status: "archived" });
                await archiveOrCancelActivitiesByDoc(other.id, user.id);
              }
            }
            return formatResumeSuccess();
          })()
        : "Número inválido. Use retomar para ver seus conteúdos pausados.";
      await saveBotReply(user.id, userChannel.id, reply, today);
      return [reply];
    }

    // Aguardando mensagem de suporte
    if (pendingIntent === "support") {
      const channelCode = userChannel.channelCode ?? userChannel.channelId;
      const planLabel = user.planCode === "pro" ? "Pro" : "Trial";
      const supportMsg = `*Suporte*\n\nUsuário: ${channelCode}\nPlano: ${planLabel}\nMensagem: "${text}"`;
      const supportNumber = process.env.WA_SUPPORT;
      if (supportNumber) {
        await sendWhatsAppMessage(supportNumber, supportMsg);
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
      return [reply];
    }
  }

  // ─── Fluxo normal ────────────────────────────────────────────────────────

  const activeActivities = await findActiveActivitiesByUser(user.id);
  const activeActivity = activeActivities[0] ?? null;

  // waitingUser === true → ignora match de comando, trata como resposta de prática
  const effectiveIntent: MessageIntent =
    activeActivity?.waitingUser && parsed.intent !== "free_text"
      ? "free_text"
      : parsed.intent;

  let messageIntent: MessageIntent = effectiveIntent;
  let reply = "";

  switch (effectiveIntent) {
    case "list_commands":
    case "unknown_command": {
      reply = formatCommandList();
      break;
    }

    case "list_docs": {
      const activities = await findActivitiesForDocsList(user.id);
      reply = formatDocsList(activities);
      break;
    }

    case "support": {
      reply = formatSupportRequest();
      break;
    }

    case "pause_doc": {
      const activeDocs = await findActiveDocsByUser(user.id);
      if (activeDocs.length === 0) {
        reply = formatNoPausableDocs();
        messageIntent = "free_text";
        break;
      }
      if (parsed.docIndex !== undefined) {
        const doc = activeDocs[parsed.docIndex - 1];
        if (!doc) {
          reply = "Número inválido. Use pausar para ver seus conteúdos ativos.";
        } else {
          await updateDoc(doc.id, user.id, { status: "paused" });
          await pauseActivitiesByDoc(doc.id, user.id);
          reply = formatPauseSuccess();
        }
        messageIntent = "free_text";
        break;
      }
      if (activeDocs.length === 1) {
        await updateDoc(activeDocs[0].id, user.id, { status: "paused" });
        await pauseActivitiesByDoc(activeDocs[0].id, user.id);
        reply = formatPauseSuccess();
        messageIntent = "free_text";
        break;
      }
      reply = formatPausePrompt(activeDocs);
      messageIntent = "awaiting_pause_select";
      break;
    }

    case "resume_doc": {
      const allDocs = await findDocsByUser(user.id);
      const pausedDocs = allDocs.filter((d) => d.status === "paused");
      if (pausedDocs.length === 0) {
        reply = formatNoPausedDocs();
        messageIntent = "free_text";
        break;
      }
      if (parsed.docIndex !== undefined) {
        const doc = pausedDocs[parsed.docIndex - 1];
        if (!doc) {
          reply =
            "Número inválido. Use retomar para ver seus conteúdos pausados.";
        } else {
          await updateDoc(doc.id, user.id, { status: "active" });
          await resumeActivitiesByDoc(doc.id, user.id);
          const others = await findActiveOrPausedDocsByUser(user.id);
          for (const other of others) {
            if (other.id !== doc.id) {
              await updateDoc(other.id, user.id, { status: "archived" });
              await archiveOrCancelActivitiesByDoc(other.id, user.id);
            }
          }
          reply = formatResumeSuccess();
        }
        messageIntent = "free_text";
        break;
      }
      if (pausedDocs.length === 1) {
        await updateDoc(pausedDocs[0].id, user.id, { status: "active" });
        await resumeActivitiesByDoc(pausedDocs[0].id, user.id);
        const others = await findActiveOrPausedDocsByUser(user.id);
        for (const other of others) {
          if (other.id !== pausedDocs[0].id) {
            await updateDoc(other.id, user.id, { status: "archived" });
            await archiveOrCancelActivitiesByDoc(other.id, user.id);
          }
        }
        reply = formatResumeSuccess();
        messageIntent = "free_text";
        break;
      }
      reply = formatResumePrompt(pausedDocs);
      messageIntent = "awaiting_resume_select";
      break;
    }

    case "practice_now": {
      const activeActivities = await findActiveActivitiesByUser(user.id);
      const activeActivity = activeActivities[0] ?? null;
      if (!activeActivity) {
        reply = "Nenhuma prática ativa no momento.";
        messageIntent = "free_text";
        break;
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
        const reply = formatIntensiveModeActivated();
        await saveBotReply(user.id, userChannel.id, reply, today);
        return [reply];
      }
      const practiceDoc = await findDocById(activeActivity.docId, user.id);
      if (!practiceDoc) {
        reply = "Nenhuma prática ativa no momento.";
        messageIntent = "free_text";
        break;
      }
      const nextQ = await resolveNextQuestion(
        activeActivity.docId,
        activeActivity.lastQuestionId,
        activeActivity.roundCompleted,
        activeActivity.id,
      );
      if (!nextQ) {
        reply = "Todas as perguntas já foram respondidas corretamente.";
        messageIntent = "free_text";
        break;
      }
      const replies = await sendIntensiveQuestion(
        nextQ,
        activeActivity.id,
        user.id,
        userChannel.id,
        activeActivity.executionCount,
        activeActivity.intervalMinutes,
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
      return replies;
    }

    case "confirm":
    case "cancel_no": {
      reply = "Nenhuma ação pendente.";
      messageIntent = "free_text";
      break;
    }

    case "cancel": {
      const pendingDoc = await findPendingDocByUser(user.id);
      if (pendingDoc) {
        await updateDoc(pendingDoc.id, user.id, { status: "canceled" });
        reply = "Cancelado.";
      } else {
        reply = "Nenhuma ação pendente.";
      }
      messageIntent = "free_text";
      break;
    }

    case "free_text": {
      if (text.length >= MIN_DOC_CHARS) {
        const pendingDoc = await findPendingDocByUser(user.id);
        if (pendingDoc) {
          const validCount = await countValidDocItemsByDoc(pendingDoc.id);
          if (!canAddDocItem(validCount)) {
            await saveUserMsg(
              user.id,
              userChannel.id,
              text,
              "free_text",
              input,
              today,
            );
            const limitReply = formatDocItemLimitReached();
            await saveBotReply(user.id, userChannel.id, limitReply, today);
            return [limitReply];
          }
          const itemValidation = validateDocItemInput(text, "text");
          if (!itemValidation.success) {
            await saveUserMsg(
              user.id,
              userChannel.id,
              text,
              "free_text",
              input,
              today,
            );
            await saveBotReply(
              user.id,
              userChannel.id,
              itemValidation.error,
              today,
            );
            return [itemValidation.error];
          }
          const savedMsg = await saveMessage({
            userId: user.id,
            userChannelId: userChannel.id,
            role: "user",
            content: text,
            intent: "free_text",
            externalId: input.externalId,
            mediaType: input.mediaType,
            mediaId: input.mediaId,
            metadata: input.mediaMetadata,
          });
          await incrementUserMessageCount(user.id, today);
          const docItem = await createDocItem({
            docId: pendingDoc.id,
            userId: user.id,
            messageId: savedMsg.id,
            docType: "text",
            rawContent: text,
            order: validCount + 1,
          });
          await publishDocMerge(pendingDoc.id, user.id, docItem.id);
          const ackReply = formatDocItemReceived(validCount + 1);
          await saveBotReply(user.id, userChannel.id, ackReply, today);
          return [ackReply];
        }

        const activityCount = await getTodayActivityCount(user.id, today);
        if (!canStartActivity(activityCount)) {
          reply = formatDailyActivityLimitReached();
          messageIntent = "free_text";
          break;
        }
        const textValidation = validateDocItemInput(text, "text");
        if (!textValidation.success) {
          reply = textValidation.error;
          messageIntent = "free_text";
          break;
        }
        const activeDocs = await findActiveDocsByUser(user.id);
        if (activeDocs.length > 0) {
          reply = formatDocReplacePrompt(
            activeDocs[0].title ?? "",
            MAX_ACTIVITIES_PER_DAY - activityCount,
          );
          messageIntent = "awaiting_doc_replace";
          break;
        }
        reply = formatDocConfirmPrompt();
        messageIntent = "awaiting_doc_confirm";
        break;
      }

      if (!activeActivity) {
        reply = formatNoDocs();
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
          const pendingQuestion = await findPendingQuestion(activeActivity.id);
          if (pendingQuestion) {
            const questionFormats = [
              pendingQuestion.questionFormat,
            ] as QuestionFormat[];
            const feedbackExamples = pendingQuestion.questionFormat
              ? getFeedbackExamples(questionFormats, practiceDoc.level)
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
              level: practiceDoc.level,
              userId: user.id,
              docId: practiceDoc.id,
              questionFormats,
            });
            const evalStatus = evaluation?.status ?? "wrong";
            const feedback = evaluation
              ? humanizeFeedback(evaluation)
              : "Não consegui avaliar sua resposta!";
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
            const isPracticingSessionActive =
              activeActivity.intensiveUntil &&
              activeActivity.intensiveUntil > new Date();
            await updateActivity(activeActivity.id, user.id, {
              waitingUser: false,
              interactionCount: activeActivity.interactionCount + 1,
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

            if (isPracticingSessionActive) {
              const replies = await handleIntensiveNextQuestion(
                activeActivity.docId,
                activeActivity.lastQuestionId,
                activeActivity.roundCompleted,
                activeActivity.id,
                user.id,
                userChannel.id,
                activeActivity.intervalMinutes,
                activeActivity.executionCount,
                today,
              );
              if (replies.length > 0) return [feedback, ...replies];
            }

            return [feedback];
          }
        }
      }

      reply =
        "Aguarda, a próxima mensagem chega em breve. Se quiser mudar de atividade, é só mandar um novo conteúdo.";
      break;
    }
  }

  await saveUserMsg(user.id, userChannel.id, text, messageIntent, input, today);
  await saveBotReply(user.id, userChannel.id, reply, today);

  return [reply];
}

// ─── Question selection helpers ──────────────────────────────────────────────

export async function resolveNextQuestion(
  docId: string,
  lastQuestionId: string | null,
  roundCompleted: boolean,
  activityId: string,
): Promise<{
  id: string;
  question: string;
  status: QuestionStatus | null;
  sectionId: string | null;
  questionFormat: QuestionFormat | null;
  questionOptions: string[];
} | null> {
  if (!roundCompleted) {
    const sm2 = await findSm2EligibleQuestion(activityId, lastQuestionId);
    if (sm2) return sm2;

    const unanswered = await findNextUnansweredQuestion(docId, lastQuestionId);
    if (unanswered) return unanswered;
    const openRemains = await hasWrongOrPartial(docId);
    if (openRemains) return findNextGeneralQuestion(activityId, lastQuestionId);
    return findNextGeneralQuestion(activityId, lastQuestionId);
  }
  return findNextGeneralQuestion(activityId, lastQuestionId);
}

async function handleIntensiveNextQuestion(
  docId: string,
  lastQuestionId: string | null,
  roundCompleted: boolean,
  activityId: string,
  userId: string,
  userChannelId: string,
  intervalMinutes: number,
  executionCount: number,
  today: Date,
): Promise<string[]> {
  const lastId = lastQuestionId;

  if (!roundCompleted) {
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
    const openRemains = await hasWrongOrPartial(docId);
    if (openRemains) {
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

    const completionMsg = await completeRoundZero(
      activityId,
      userId,
      today,
      userChannelId,
      intervalMinutes,
    );

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
    "externalId" | "mediaType" | "mediaId" | "mediaMetadata"
  >,
  today: Date,
): Promise<void> {
  await saveMessage({
    userId,
    userChannelId,
    role: "user",
    content,
    intent,
    externalId: input.externalId,
    mediaType: input.mediaType,
    mediaId: input.mediaId,
    metadata: input.mediaMetadata,
  });
  await incrementUserMessageCount(userId, today);
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
    "externalId" | "mediaType" | "mediaId" | "mediaMetadata"
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

  const activeDocs = await findActiveDocsByUser(userId);
  if (activeDocs.length > 0) {
    await saveUserMsg(
      userId,
      userChannelId,
      rawContent,
      "awaiting_doc_replace",
      input,
      today,
    );
    const reply = formatDocReplacePrompt(
      activeDocs[0].title ?? "",
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
