import { PlanStatus } from '@prisma/client'
import { canPractice } from './access'
import { MAX_DOCS_PER_DAY } from '../lib/constants'

export function canUseAudio(user: { planStatus: PlanStatus; planExpiresAt: Date | null }): boolean {
  return canPractice(user)
}

export function canUseImage(user: { planStatus: PlanStatus; planExpiresAt: Date | null }): boolean {
  return canPractice(user)
}

export function canUploadDoc(docCount: number): boolean {
  return docCount < MAX_DOCS_PER_DAY
}
