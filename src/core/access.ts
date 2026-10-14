import { PlanStatus } from "../lib/prisma"

export function canPractice(user: {
  planStatus: PlanStatus
  planExpiresAt: Date | null
}): boolean {
  if (user.planStatus !== 'active') return false
  if (user.planExpiresAt && user.planExpiresAt < new Date()) return false
  return true
}

const DAY_MS = 24 * 60 * 60 * 1000

export function getDaysUntil(date: Date | null, now: Date): number {
  if (!date) return 0
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS)
}
