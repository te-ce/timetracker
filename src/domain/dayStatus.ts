import type { DayType } from './dayType'

export type DayStatus =
  | 'non-working'
  | 'leave'
  | 'future'
  | 'today'
  | 'complete'
  | 'needs-review'
  | 'untracked'

interface DayStatusInput {
  dayType: DayType
  hasWorkedHours: boolean
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  isConfirmed?: boolean
  isoDate: string
  today: string
}

export function getDayStatus({ dayType, hasWorkedHours, isEntriesBalanced, hasAutoCategory, isConfirmed = false, isoDate, today }: DayStatusInput): DayStatus {
  // Leave days (Vacation, SickDay, Absence)
  if (dayType === 'Vacation' || dayType === 'SickDay' || dayType === 'Absence') return 'leave'

  // Non-working (Weekend, PublicHoliday)
  if (dayType !== 'WorkDay') return 'non-working'

  // Future days
  if (isoDate > today) return hasWorkedHours ? 'complete' : 'future'

  // Today
  if (isoDate === today) return 'today'

  // Past work days
  if (!hasWorkedHours) return 'untracked'

  if (isConfirmed) return 'complete'
  const effectivelyBalanced = isEntriesBalanced || hasAutoCategory
  if (effectivelyBalanced) return 'complete'
  return 'needs-review'
}
