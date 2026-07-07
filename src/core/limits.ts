import { PlanStatus } from "../lib/prisma"
import { canPractice } from './access'
import { DAILY_PRACTICE_LIMIT, INTENSIVE_LIMIT, MAX_ACTIVITIES_PER_DAY, MAX_DOC_ITEMS_PER_DOC } from '../lib/constants'

export function canUseAudio(user: { planStatus: PlanStatus; planExpiresAt: Date | null }): boolean {
  return canPractice(user)
}

export function canUseImage(user: { planStatus: PlanStatus; planExpiresAt: Date | null }): boolean {
  return canPractice(user)
}

export function canStartActivity(activityCount: number): boolean {
  return activityCount < MAX_ACTIVITIES_PER_DAY
}

export function canAddDocItem(validItemCount: number): boolean {
  return validItemCount < MAX_DOC_ITEMS_PER_DOC
}

export function canPracticeToday(
  practiceCount: number,
  intensiveCount: number,
  isIntensive: boolean,
): boolean {
  if (practiceCount >= DAILY_PRACTICE_LIMIT) return false;
  if (isIntensive && intensiveCount >= INTENSIVE_LIMIT) return false;
  return true;
}
