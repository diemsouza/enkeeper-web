import { PlanStatus } from '@prisma/client'

export function canPractice(user: {
  planStatus: PlanStatus
  planExpiresAt: Date | null
}): boolean {
  if (user.planStatus !== 'active') return false
  if (user.planExpiresAt && user.planExpiresAt < new Date()) return false
  return true
}
