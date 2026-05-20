import type { DayType } from './dayType'

export type DayStatus =
  | 'non-working'
  | 'leave'
  | 'future'
  | 'today'
  | 'tracked'
  | 'incomplete'
  | 'untracked'

interface DayStatusInput {
  dayType: DayType
  hasWorkedHours: boolean
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  isoDate: string
  today: string
}

export function getDayStatus({ dayType, hasWorkedHours, isEntriesBalanced, hasAutoCategory, isoDate, today }: DayStatusInput): DayStatus {
  // Leave days (Vacation, SickDay, Absence)
  if (dayType === 'Vacation' || dayType === 'SickDay' || dayType === 'Absence') return 'leave'

  // Non-working (Weekend, PublicHoliday)
  if (dayType !== 'WorkDay') return 'non-working'

  // Future days
  if (isoDate > today) return hasWorkedHours ? 'tracked' : 'future'

  // Today
  if (isoDate === today) return 'today'

  // Past work days
  if (!hasWorkedHours) return 'untracked'

  const effectivelyBalanced = isEntriesBalanced || hasAutoCategory
  if (effectivelyBalanced) return 'tracked'
  return 'incomplete'
}
