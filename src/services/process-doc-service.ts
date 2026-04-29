import { findDocById, updateDoc } from "../repo/docs.repo";
import { createActivity } from "../repo/activities.repo";
import { llmUsageService } from "./llm-usage-service";
import { extractDocContent } from "../vendors/llm.vendor";
import { NEXT_MESSAGE_INTERVAL_MIN } from "../lib/constants";

export async function processDoc(docId: string, userId: string): Promise<void> {
  const doc = await findDocById(docId, userId);
  if (!doc) {
    console.warn(`[process-doc] doc not found: ${docId}`);
    return;
  }

  const { result, inputTokens, outputTokens } = await extractDocContent(doc.rawContent);

  if (!result) {
    console.error(`[process-doc] AI failed for doc ${docId}`);
    await updateDoc(docId, userId, { status: "archived" });
    return;
  }

  await llmUsageService.registerUsage({
    userId,
    docId,
    usageType: "topic_extraction",
    provider: "openai",
    model: "gpt-4.1-mini",
    inputTokens,
    outputTokens,
    cachedTokens: 0,
  });

  await updateDoc(docId, userId, {
    title: result.title,
    content: result.content,
    topicsData: result.topics,
    status: "active",
  });

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
