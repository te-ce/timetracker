import type { DayType } from './dayType'

export type DayStatus =
  | 'non-working'
  | 'future'
  | 'today'
  | 'today-tracked'
  | 'today-incomplete'
  | 'today-needs-attention'
  | 'tracked'
  | 'incomplete'
  | 'needs-attention'

interface DayStatusInput {
  dayType: DayType
  hasWorkedHours: boolean
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  isoDate: string
  today: string
  hasAnyTrackedHours: boolean
}

export function getDayStatus({ dayType, hasWorkedHours, isEntriesBalanced, hasAutoCategory, isoDate, today, hasAnyTrackedHours }: DayStatusInput): DayStatus {
  // 1. Non-working and future are terminal
  if (dayType !== 'WorkDay') return 'non-working'
  if (isoDate > today) return hasWorkedHours ? 'tracked' : 'future'

  // Hours are effectively balanced when entries cover worked hours OR auto-category absorbs the rest
  const effectivelyBalanced = isEntriesBalanced || hasAutoCategory

  // 2. Today — combine with secondary status
  if (isoDate === today) {
    if (hasWorkedHours && effectivelyBalanced) return 'today-tracked'
    if (hasWorkedHours && !effectivelyBalanced) return 'today-incomplete'
    if (hasAnyTrackedHours) return 'today-needs-attention'
    return 'today'
  }

  // 3. Past work days
  if (hasWorkedHours && effectivelyBalanced) return 'tracked'
  if (hasWorkedHours && !effectivelyBalanced) return 'incomplete'
  if (!hasAnyTrackedHours) return 'future'
  return 'needs-attention'
}
