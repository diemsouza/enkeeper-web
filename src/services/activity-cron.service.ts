import { findEligibleActivities, completeActivity, updateActivity } from '../repo/activities.repo'
import { findDocById, updateDoc } from '../repo/docs.repo'
import { saveMessage, findLastActivityMessage } from '../repo/messages.repo'
import { findUserChannelByUserId } from '../repo/users.repo'
import { incrementAgentMessageCount } from '../repo/daily-usage.repo'
import { generatePracticeMessage } from '../vendors/llm.vendor'
import { sendWhatsAppMessage } from '../vendors/whatsapp.vendor'
import { formatPracticeNudge } from '../core/formatters'
import { NEXT_MESSAGE_INTERVAL_MIN, DOC_PROCESSING_TIMEOUT_MS } from '../lib/constants'

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

      if (doc.status === 'processing') {
        const ageMs = Date.now() - doc.createdAt.getTime()
        if (ageMs > DOC_PROCESSING_TIMEOUT_MS) {
          await updateDoc(doc.id, activity.userId, { status: 'failed' })
          const userChannel = await findUserChannelByUserId(activity.userId)
          if (userChannel) {
            const msg = 'Não consegui processar seu conteúdo. Tenta mandar de novo.'
            await sendWhatsAppMessage(userChannel.channelId, msg)
            await saveMessage({
              userId: activity.userId,
              userChannelId: userChannel.id,
              role: 'assistant',
              content: msg,
              intent: 'system_error',
            })
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            await incrementAgentMessageCount(activity.userId, today)
          }
        }
        skipped++
        continue
      }

      if (activity.waitingUser) {
        skipped++
        continue
      }

      const topics = doc.topicsData as string[]

      if (activity.topicIndex >= topics.length) {
        await completeActivity(activity.id, activity.userId)
        skipped++
        continue
      }

      const lastMsg = await findLastActivityMessage(activity.id)
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.intent === 'practice_message') {
        const userChannel = await findUserChannelByUserId(activity.userId)
        if (!userChannel) {
          skipped++
          continue
        }
        const nudge = formatPracticeNudge()
        await sendWhatsAppMessage(userChannel.channelId, nudge)
        await saveMessage({
          userId: activity.userId,
          userChannelId: userChannel.id,
          activityId: activity.id,
          role: 'assistant',
          content: nudge,
          intent: 'practice_nudge',
        })
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        await incrementAgentMessageCount(activity.userId, today)
        await updateActivity(activity.id, activity.userId, { waitingUser: true })
        processed++
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
