import {
  findDocById,
  findActiveOrPausedDocsByUser,
  updateDoc,
} from "../repo/docs.repo";
import { createActivity } from "../repo/activities.repo";
import { archiveOrCancelActivitiesByDoc } from "./activity-service";
import { generateDocTopics } from "../vendors/llm.vendor";
import { findUserChannelByUserId } from "../repo/users.repo";
import { saveMessage } from "../repo/messages.repo";
import { sendWhatsAppMessage } from "../vendors/whatsapp.vendor";
import { NEXT_MESSAGE_INTERVAL_MIN } from "../lib/constants";

export async function processDoc(docId: string, userId: string): Promise<void> {
  const doc = await findDocById(docId, userId);
  if (!doc) {
    console.warn(`[process-doc] doc not found: ${docId}`);
    return;
  }

  const result = await generateDocTopics({
    rawContent: doc.rawContent,
    docType: doc.docType,
    userId,
    docId,
  });

  if (!result) {
    console.error(`[process-doc] AI failed for doc ${docId}`);
    await updateDoc(docId, userId, { status: "failed" });
    return;
  }

  if (!result.isValid) {
    await updateDoc(docId, userId, { status: "failed" });
    const userChannel = await findUserChannelByUserId(userId);
    if (userChannel) {
      const msg =
        "Não consegui identificar conteúdo suficiente para criar uma prática. Tenta mandar um texto mais completo.";
      await sendWhatsAppMessage(userChannel.channelId, msg);
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

  await updateDoc(docId, userId, {
    title: result.title,
    content: result.content,
    topicsData: result.topics,
    status: "active",
  });

  const otherDocs = await findActiveOrPausedDocsByUser(userId);
  for (const other of otherDocs) {
    if (other.id !== docId) {
      await updateDoc(other.id, userId, { status: "archived" });
      await archiveOrCancelActivitiesByDoc(other.id, userId);
    }
  }

  const now = new Date();
  const intervalMinutes = NEXT_MESSAGE_INTERVAL_MIN;
  const nextMessageAt = new Date(now.getTime() + intervalMinutes * 60 * 1000);
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await createActivity({
    userId,
    docId,
    date,
    nextMessageAt,
    intervalMinutes,
    status: "active",
    approach: result.approach,
    approachConfidence: result.approachConfidence,
  });
}
