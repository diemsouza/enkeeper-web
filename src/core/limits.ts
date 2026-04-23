import { PlanCode } from '../types/domain'

export const FREE_LIMITS = {
  dailyNotes: 5,
  maxTags: 3,
  historyDays: 30,
}

export const PRO_LIMITS = {
  dailyNotes: 30,
  maxTags: Infinity,
  historyDays: Infinity,
}

export function canSaveNote(plan: PlanCode, todayCount: number): boolean {
  const limit = plan === 'pro' ? PRO_LIMITS.dailyNotes : FREE_LIMITS.dailyNotes
  return todayCount < limit
}

export function canCreateTag(plan: PlanCode, currentTagCount: number): boolean {
  const limit = plan === 'pro' ? PRO_LIMITS.maxTags : FREE_LIMITS.maxTags
  return currentTagCount < limit
}

export function canUseSearch(plan: PlanCode): boolean {
  return plan === 'pro'
}

export function canUseAudio(plan: PlanCode): boolean {
  return plan === 'pro'
}

export function canUseImage(plan: PlanCode): boolean {
  return plan === 'pro'
}

export function canAccessHistory(plan: PlanCode, noteCreatedAt: Date): boolean {
  if (plan === 'pro') return true
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - FREE_LIMITS.historyDays)
  return noteCreatedAt >= cutoff
}
