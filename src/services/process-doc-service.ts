import { findDocById, findActiveOrPausedDocsByUser, updateDoc } from "../repo/docs.repo";
import { createActivity, softDeleteActivitiesByDoc } from "../repo/activities.repo";
import { generateDocTopics } from "../vendors/llm.vendor";
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
      await softDeleteActivitiesByDoc(other.id, userId);
    }
  }

  const now = new Date();
  const nextMessageAt = new Date(now.getTime() + NEXT_MESSAGE_INTERVAL_MIN * 60 * 1000);
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await createActivity({
    userId,
    docId,
    date,
    nextMessageAt,
    intervalMinutes: NEXT_MESSAGE_INTERVAL_MIN,
    status: "active",
  });
}
