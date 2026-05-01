import { User, UserChannel, DocType } from "@prisma/client";
import { parseMessage } from "../core/parser";
import { canPractice } from "../core/access";
import { canUploadDoc } from "../core/limits";
import {
  formatCommandList,
  formatDocsList,
  formatDocConfirmPrompt,
  formatDocReplacePrompt,
  formatDocReceived,
  formatPausePrompt,
  formatPauseSuccess,
  formatNoPausableDocs,
  formatResumePrompt,
  formatResumeSuccess,
  formatNoPausedDocs,
  formatShortTextWithDocs,
  formatShortTextNoDocs,
  formatOnboardingMessage,
  formatTrialWelcome,
  formatPlanExpired,
  formatSupportRequest,
  formatSupportReceived,
  formatDailyLimitReached,
} from "../core/formatters";
import {
  saveMessage,
  findLastUserMessage,
  findLastAssistantMessage,
  findLastMessageByIntent,
} from "../repo/messages.repo";
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
  updateDoc,
} from "../repo/docs.repo";
import {
  findActivityById,
  findActiveActivitiesByUser,
  pauseActivitiesByDoc,
  resumeActivitiesByDoc,
  softDeleteActivitiesByDoc,
  updateActivity,
} from "../repo/activities.repo";
import { getEffectiveApproach } from "../core/approach";
import {
  getTodayUsage,
  incrementDailyDocCount,
  incrementUserMessageCount,
  incrementAgentMessageCount,
} from "../repo/daily-usage.repo";
import { publishDocProcessing } from "../lib/qstash";
import { sendWhatsAppMessage } from "../vendors/whatsapp.vendor";
import { generatePracticeFeedback } from "../vendors/llm.vendor";
import { validateContent } from "../core/validate-content";
import { MIN_DOC_CHARS } from "../lib/constants";
import { IncomingMessage, MessageIntent } from "../types/domain";

type UserWithChannels = User & { channels: UserChannel[] };

const OVERRIDING_INTENTS: MessageIntent[] = [
  "list_commands",
  "list_docs",
  "support",
  "pause_doc",
  "resume_doc",
  "unknown_command",
  "cancel",
];

export async function handleIncomingMessage(
  input: IncomingMessage,
): Promise<string[]> {
  const user = await findOrCreateUserByChannel(
    input.channelType,
    input.channelId,
    input.channelCode,
  );
  const userChannel = user.channels.find(
    (c) => c.channelId === input.channelId,
  )!;
  const text = input.text ?? "";
  const today = todayDate();

  // Carrega última mensagem do assistente - usada para reset de waitingUser e feedback de prática
  const lastAssistantMsg = await findLastAssistantMessage(user.id);

  // Zera waitingUser imediatamente ao receber qualquer mensagem do usuário
  if (text && lastAssistantMsg?.activityId) {
    await updateActivity(lastAssistantMsg.activityId, user.id, {
      waitingUser: false,
    });
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
      if (process.env.WA_SUPPORT)
        await sendWhatsAppMessage(process.env.WA_SUPPORT, supportMsg);
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
    await saveUserMsg(user.id, userChannel.id, text, "free_text", input, today);
    const welcome = formatOnboardingMessage();
    const trial = formatTrialWelcome();
    await saveBotReply(user.id, userChannel.id, welcome, today);
    await saveBotReply(user.id, userChannel.id, trial, today);
    return [welcome, trial];
  }

  // ─── Mídia → cria Doc ──────────────────────────────────────────────────────

  if (
    input.mediaType === "audio" ||
    input.mediaType === "image" ||
    input.mediaType === "pdf"
  ) {
    const docType = input.mediaType as DocType;
    return checkAndCreateDoc(
      user.id,
      userChannel.id,
      text,
      today,
      input,
      docType,
    );
  }

  // ─── Estado pendente ──────────────────────────────────────────────────────

  const isOverriding = OVERRIDING_INTENTS.includes(parsed.intent);

  if (pendingIntent && !isOverriding) {
    // Aguardando /sim ou /não após texto longo
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
        return checkAndCreateDoc(
          user.id,
          userChannel.id,
          lastUserMessage!.content,
          today,
        );
      }
      await saveUserMsg(user.id, userChannel.id, text, "cancel", input, today);
      const reply = "Cancelado.";
      await saveBotReply(user.id, userChannel.id, reply, today);
      return [reply];
    }

    // Aguardando /sim ou /não para substituir doc ativo
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
        return createDocFlow(
          user.id,
          userChannel.id,
          lastUserMessage!.content,
          originalDocType,
          today,
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
        : "Número inválido. Use /pausar para ver seus conteúdos ativos.";
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
                await softDeleteActivitiesByDoc(other.id, user.id);
              }
            }
            return formatResumeSuccess();
          })()
        : "Número inválido. Use /retomar para ver seus conteúdos pausados.";
      await saveBotReply(user.id, userChannel.id, reply, today);
      return [reply];
    }

    // Aguardando mensagem de suporte
    if (pendingIntent === "support") {
      const channelCode = userChannel.channelCode ?? userChannel.channelId;
      const planLabel = user.planCode === "pro" ? "Pro" : "Trial";
      const supportMsg = `*Suporte*\n\nUsuário: ${channelCode}\nPlano: ${planLabel}\nMensagem: "${text}"`;
      const supportNumber = process.env.WA_SUPPORT;
      if (supportNumber) await sendWhatsAppMessage(supportNumber, supportMsg);
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

  let messageIntent: MessageIntent = parsed.intent;
  let reply = "";

  switch (parsed.intent) {
    case "list_commands":
    case "unknown_command": {
      reply = formatCommandList();
      break;
    }

    case "list_docs": {
      const docs = await findDocsByUser(user.id);
      reply = formatDocsList(docs);
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
          reply =
            "Número inválido. Use /pausar para ver seus conteúdos ativos.";
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
            "Número inválido. Use /retomar para ver seus conteúdos pausados.";
        } else {
          await updateDoc(doc.id, user.id, { status: "active" });
          await resumeActivitiesByDoc(doc.id, user.id);
          const others = await findActiveOrPausedDocsByUser(user.id);
          for (const other of others) {
            if (other.id !== doc.id) {
              await updateDoc(other.id, user.id, { status: "archived" });
              await softDeleteActivitiesByDoc(other.id, user.id);
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
            await softDeleteActivitiesByDoc(other.id, user.id);
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

    case "confirm":
    case "cancel":
    case "cancel_no": {
      reply = "Nenhuma ação pendente.";
      messageIntent = "free_text";
      break;
    }

    case "free_text": {
      if (text.length >= MIN_DOC_CHARS) {
        const validation = validateContent(text);
        if (!validation.isValid) {
          const activeDocs = await findActiveDocsByUser(user.id);
          reply =
            activeDocs.length > 0
              ? formatShortTextWithDocs()
              : formatShortTextNoDocs();
          messageIntent = "free_text";
          break;
        }
        const todayUsage = await getTodayUsage(user.id, today);
        if (!canUploadDoc(todayUsage?.docCount ?? 0)) {
          reply = formatDailyLimitReached();
          messageIntent = "free_text";
          break;
        }
        const activeDocs = await findActiveDocsByUser(user.id);
        if (activeDocs.length > 0) {
          reply = formatDocReplacePrompt(activeDocs[0].title);
          messageIntent = "awaiting_doc_replace";
          break;
        }
        reply = formatDocConfirmPrompt();
        messageIntent = "awaiting_doc_confirm";
        break;
      }

      // Feedback de resposta de prática
      const PRACTICE_RESPONSE_INTENTS = [
        "practice_message",
        "practice_feedback",
        "practice_nudge",
      ];
      if (
        lastAssistantMsg?.activityId &&
        PRACTICE_RESPONSE_INTENTS.includes(lastAssistantMsg.intent ?? "")
      ) {
        const practiceActivity = await findActivityById(
          lastAssistantMsg.activityId,
          user.id,
        );
        const practiceDoc = practiceActivity
          ? await findDocById(practiceActivity.docId, user.id)
          : null;
        if (practiceDoc) {
          const topics = practiceDoc.topicsData as string[];
          const topicIdx = Math.max(0, practiceActivity!.topicIndex - 1);

          let question = lastAssistantMsg.content;
          if (lastAssistantMsg.intent !== "practice_message") {
            const lastPracticeMsg = await findLastMessageByIntent(
              lastAssistantMsg.activityId,
              "practice_message",
            );
            question = lastPracticeMsg?.content ?? lastAssistantMsg.content;
          }

          const feedback = await generatePracticeFeedback({
            question,
            userReply: text,
            topic: topics[topicIdx] ?? "",
            docContent: practiceDoc.content,
            userId: user.id,
            docId: practiceDoc.id,
            approach: getEffectiveApproach(practiceActivity!),
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
            activityId: lastAssistantMsg.activityId,
            role: "assistant",
            content: feedback,
            intent: "practice_feedback",
          });
          await incrementAgentMessageCount(user.id, today);
          return [feedback];
        }
      }

      // Fallback: se há atividade ativa mas lastAssistantMsg não era de prática,
      // busca a última mensagem de prática dessa atividade e gera feedback
      const activeActivities = await findActiveActivitiesByUser(user.id);
      if (activeActivities.length > 0) {
        const activeActivity = activeActivities[0];
        const lastPracticeMsg = await findLastMessageByIntent(
          activeActivity.id,
          "practice_message",
        );
        const practiceDoc = lastPracticeMsg
          ? await findDocById(activeActivity.docId, user.id)
          : null;
        if (practiceDoc) {
          const topics = practiceDoc.topicsData as string[];
          const topicIdx = Math.max(0, activeActivity.topicIndex - 1);
          const feedback = await generatePracticeFeedback({
            question: lastPracticeMsg!.content,
            userReply: text,
            topic: topics[topicIdx] ?? "",
            docContent: practiceDoc.content,
            userId: user.id,
            docId: practiceDoc.id,
            approach: getEffectiveApproach(activeActivity),
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
          });
          await incrementAgentMessageCount(user.id, today);
          return [feedback];
        }
      }

      const activeDocs = await findActiveDocsByUser(user.id);
      reply =
        activeDocs.length > 0
          ? formatShortTextWithDocs()
          : formatShortTextNoDocs();
      break;
    }
  }

  await saveUserMsg(user.id, userChannel.id, text, messageIntent, input, today);
  await saveBotReply(user.id, userChannel.id, reply, today);

  return [reply];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

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

async function checkAndCreateDoc(
  userId: string,
  userChannelId: string,
  content: string,
  today: Date,
  input?: Pick<
    IncomingMessage,
    "externalId" | "mediaType" | "mediaId" | "mediaMetadata"
  >,
  docType: DocType = "text",
): Promise<string[]> {
  const todayUsage = await getTodayUsage(userId, today);
  if (!canUploadDoc(todayUsage?.docCount ?? 0)) {
    if (input)
      await saveUserMsg(
        userId,
        userChannelId,
        content,
        "free_text",
        input,
        today,
      );
    const reply = formatDailyLimitReached();
    await saveBotReply(userId, userChannelId, reply, today);
    return [reply];
  }

  const activeDocs = await findActiveDocsByUser(userId);
  if (activeDocs.length > 0) {
    if (input)
      await saveUserMsg(
        userId,
        userChannelId,
        content,
        "awaiting_doc_replace",
        input,
        today,
      );
    const reply = formatDocReplacePrompt(activeDocs[0].title);
    await saveBotReply(userId, userChannelId, reply, today);
    return [reply];
  }

  if (input)
    await saveUserMsg(
      userId,
      userChannelId,
      content,
      "free_text",
      input,
      today,
    );
  return createDocFlow(userId, userChannelId, content, docType, today);
}

async function createDocFlow(
  userId: string,
  userChannelId: string,
  rawContent: string,
  docType: DocType,
  today: Date,
): Promise<string[]> {
  const doc = await createDoc({
    userId,
    title: "",
    docType,
    rawContent,
    content: "",
    topicsData: [],
    status: "processing",
  });
  await publishDocProcessing(doc.id, userId);
  await incrementDailyDocCount(userId, today);
  const reply = formatDocReceived();
  await saveBotReply(userId, userChannelId, reply, today);
  return [reply];
}
