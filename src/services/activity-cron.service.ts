import { findEligibleActivities, completeActivity, updateActivity } from '../repo/activities.repo'
import { findDocById } from '../repo/docs.repo'
import { saveMessage } from '../repo/messages.repo'
import { findUserChannelByUserId } from '../repo/users.repo'
import { incrementAgentMessageCount } from '../repo/daily-usage.repo'
import { generatePracticeMessage } from '../vendors/llm.vendor'
import { sendWhatsAppMessage } from '../vendors/whatsapp.vendor'
import { NEXT_MESSAGE_INTERVAL_MIN } from '../lib/constants'

type CronResult = {
  processed: number
  skipped: number
  errors: number
}

export async function processActivityCron(): Promise<CronResult> {
  const activities = await findEligibleActivities(100)

  let processed = 0
  let skipped = 0
  let errors = 0

  for (const activity of activities) {
    try {
      const doc = await findDocById(activity.docId, activity.userId)
      if (!doc) {
        skipped++
        continue
      }

      const topics = doc.topicsData as string[]

      if (activity.topicIndex >= topics.length) {
        await completeActivity(activity.id, activity.userId)
        skipped++
        continue
      }

      const topic = topics[activity.topicIndex]

      const message = await generatePracticeMessage({
        topic,
        lastUserReply: activity.lastUserReply,
        docContent: doc.content,
        topicIndex: activity.topicIndex,
        totalTopics: topics.length,
      })

      const userChannel = await findUserChannelByUserId(activity.userId)
      if (!userChannel) {
        skipped++
        continue
      }

      await sendWhatsAppMessage(userChannel.channelId, message)

      await saveMessage({
        userId: activity.userId,
        userChannelId: userChannel.id,
        activityId: activity.id,
        role: 'assistant',
        content: message,
        intent: 'practice_message',
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      await incrementAgentMessageCount(activity.userId, today)

      await updateActivity(activity.id, activity.userId, {
        topicIndex: activity.topicIndex + 1,
        nextMessageAt: new Date(Date.now() + NEXT_MESSAGE_INTERVAL_MIN * 60 * 1000),
      })

      processed++
    } catch (err) {
      console.error(`[activity-cron] activity ${activity.id} error:`, err)
      errors++
    }
  }

  return { processed, skipped, errors }
}
