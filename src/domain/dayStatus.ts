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
  isoDate: string
  today: string
  hasAnyTrackedHours: boolean
}

export function getDayStatus({ dayType, hasWorkedHours, isEntriesBalanced, isoDate, today, hasAnyTrackedHours }: DayStatusInput): DayStatus {
  // 1. Non-working and future are terminal
  if (dayType !== 'WorkDay') return 'non-working'
  if (isoDate > today) return hasWorkedHours ? 'tracked' : 'future'

  // 2. Today — combine with secondary status
  if (isoDate === today) {
    if (hasWorkedHours && isEntriesBalanced) return 'today-tracked'
    if (hasWorkedHours && !isEntriesBalanced) return 'today-incomplete'
    if (hasAnyTrackedHours) return 'today-needs-attention'
    return 'today'
  }

  // 3. Past work days
  if (hasWorkedHours && isEntriesBalanced) return 'tracked'
  if (hasWorkedHours && !isEntriesBalanced) return 'incomplete'
  if (!hasAnyTrackedHours) return 'future'
  return 'needs-attention'
}
