import { findDocById, updateDoc } from "../repo/docs.repo";
import { findDocItemsByDoc } from "../repo/doc-items.repo";
import {
  formatInvalidContentMessage,
  validateContent,
} from "../core/validate-content";
import {
  createActivity,
  findCurrentActivityByUser,
  updateActivity,
} from "../repo/activities.repo";
import { createSection } from "../repo/sections.repo";
import {
  archiveOrCancelActivity,
  buildPreviousActivitySummary,
} from "./activity-service";
import { generateDocSections } from "../vendors/llm.vendor";
import {
  findUserById,
  findUserChannelByUserId,
  updateUserPendingIntent,
} from "../repo/users.repo";
import { saveMessage } from "../repo/messages.repo";
import { MessageChannel } from "../types/message-channel";
import { incrementDailyActivityCount } from "../repo/daily-usage.repo";
import {
  formatLevelQuestion,
  formatDocProcessed,
  formatDocProcessingFailed,
  formatDocNoQuestions,
} from "../core/formatters";
import {
  FIRST_MESSAGE_INTERVAL_MIN,
  NEXT_MESSAGE_INTERVAL_MIN,
  MAX_ACTIVITIES_PER_DAY,
} from "../lib/constants";
import { sanitizeText } from "../lib/utils";
import { calculatePoolSize } from "../core/pool-size";
import { DocType, SectionType } from "../lib/prisma";

export async function mergeDoc(
  docId: string,
  userId: string,
  latestDocItemId: string,
  channel: MessageChannel,
): Promise<void> {
  const doc = await findDocById(docId, userId);
  if (!doc || doc.status !== "pending") {
    return;
  }

  const allItems = await findDocItemsByDoc(docId);
  const lastItem = allItems[allItems.length - 1];
  if (!lastItem || lastItem.id !== latestDocItemId) {
    return;
  }

  const validItems = allItems.filter((item) => !item.error);
  if (validItems.length === 0) {
    const error = "Nenhum item válido para processar.";
    await updateDoc(docId, userId, { status: "failed", error });
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg = formatDocNoQuestions();
      await channel.sendMessage(userChannel.channelId, msg);
      await saveMessage({
        userId,
        userChannelId: userChannel.id,
        role: "assistant",
        content: msg,
        intent: "system_error",
      });
    }
    return;
  }

  const types = Array.from(new Set(validItems.map((i) => i.docType)));
  const docType: DocType = types.length === 1 ? types[0] : "mixed";
  const consolidatedRaw = validItems
    .map((item) => item.rawContent)
    .join("\n\n");

  const user = await findUserById(userId);
  if (!user) return;

  if (user.level === null) {
    await updateDoc(docId, userId, { rawContent: consolidatedRaw, docType });
    await updateUserPendingIntent(userId, "awaiting_level_set");
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg = formatLevelQuestion();
      await channel.sendMessage(userChannel.channelId, msg);
      await saveMessage({
        userId,
        userChannelId: userChannel.id,
        role: "assistant",
        content: msg,
        intent: "awaiting_level_set",
      });
    }
    return;
  }

  try {
    const contentValidation = validateContent(consolidatedRaw);
    if (!contentValidation.isValid) {
      await updateDoc(docId, userId, {
        status: "failed",
        error: contentValidation.invalidReason ?? "Conteúdo inválido.",
      });
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatInvalidContentMessage(
          contentValidation.invalidReason,
        );
        await channel.sendMessage(userChannel.channelId, msg);
        await saveMessage({
          userId,
          userChannelId: userChannel.id,
          role: "assistant",
          content: msg,
          intent: "system_error",
        });
      }
      return;
    }

    const docSectionResult = await generateDocSections({
      rawContent: consolidatedRaw,
      docType,
      userId,
      docId,
    });

    if (!docSectionResult) {
      console.error(`[merge-doc] AI failed for doc ${docId}`);
      await updateDoc(docId, userId, {
        status: "failed",
        error: "Falha na extração de conteúdo.",
      });
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatDocProcessingFailed();
        await channel.sendMessage(userChannel.channelId, msg);
        await saveMessage({
          userId,
          userChannelId: userChannel.id,
          role: "assistant",
          content: msg,
          intent: "system_error",
        });
      }
      return;
    }

    if (!docSectionResult.isValid) {
      await updateDoc(docId, userId, {
        status: "failed",
        error: docSectionResult.invalidReason ?? "Conteúdo inválido.",
      });
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatInvalidContentMessage(docSectionResult.invalidReason);
        await channel.sendMessage(userChannel.channelId, msg);
        await saveMessage({
          userId,
          userChannelId: userChannel.id,
          role: "assistant",
          content: msg,
          intent: "system_error",
        });
      }
      return;
    }

    const combinedContent = docSectionResult.sections
      .map((s) => s.content)
      .join("\n\n");

    await updateDoc(docId, userId, {
      title: docSectionResult.title,
      rawContent: consolidatedRaw,
      content: combinedContent,
      level: docSectionResult.level,
      status: "active",
      docType,
    });

    const userLevel = user.level ?? docSectionResult.level;

    const currentActivity = await findCurrentActivityByUser(userId);
    if (currentActivity) {
      await archiveOrCancelActivity(currentActivity, userId);
    }

    const now = new Date();
    const intervalMinutes = NEXT_MESSAGE_INTERVAL_MIN;
    const nextMessageAt = new Date(
      now.getTime() + FIRST_MESSAGE_INTERVAL_MIN * 60 * 1000,
    );
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const questionLimit = docSectionResult.sections.reduce(
      (sum, s) =>
        sum +
        calculatePoolSize({
          sectionType: s.sectionType as SectionType,
          content: sanitizeText(s.content),
        }),
      0,
    );

    const activity = await createActivity({
      userId,
      docId,
      date,
      nextMessageAt,
      intervalMinutes,
      status: "active",
      userLevel,
      title: docSectionResult.title ?? "",
      questionLimit,
    });

    for (const sectionData of [...docSectionResult.sections].sort(
      (a, b) => a.order - b.order,
    )) {
      await createSection({
        userId,
        docId,
        activityId: activity.id,
        sectionType: sectionData.sectionType,
        title: sanitizeText(sectionData.title),
        content: sanitizeText(sectionData.content),
        order: sectionData.order,
      });
    }

    if (docSectionResult.sections.length > 0) {
      await updateActivity(activity.id, userId, {
        sectionCount: docSectionResult.sections.length,
      });
      const activityCount = await incrementDailyActivityCount(userId, date);
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatDocProcessed(false, MAX_ACTIVITIES_PER_DAY - activityCount);
        const summary = await buildPreviousActivitySummary(userId);
        const messages = summary ? [msg, summary] : [msg];
        await channel.sendMessage(userChannel.channelId, messages);
        for (const content of messages) {
          await saveMessage({
            userId,
            userChannelId: userChannel.id,
            role: "assistant",
            content,
          });
        }
      }
    } else {
      await updateDoc(docId, userId, {
        status: "failed",
        error: "Nenhuma seção gerada.",
      });
      const userChannel = await findUserChannelByUserId(userId);
      if (userChannel) {
        const msg = formatDocNoQuestions();
        await channel.sendMessage(userChannel.channelId, msg);
        await saveMessage({
          userId,
          userChannelId: userChannel.id,
          role: "assistant",
          content: msg,
          intent: "system_error",
        });
      }
    }
  } catch (err) {
    console.error(`[merge-doc] unexpected error for doc ${docId}`, err);
    await updateDoc(docId, userId, {
      status: "failed",
      error: err instanceof Error ? err.message : "Erro inesperado.",
    });
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg = formatDocProcessingFailed();
      await channel.sendMessage(userChannel.channelId, msg);
      await saveMessage({
        userId,
        userChannelId: userChannel.id,
        role: "assistant",
        content: msg,
        intent: "system_error",
      });
    }
  }
}
