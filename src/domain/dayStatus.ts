import type { DayType } from './dayType'

export type DayStatus = 'non-working' | 'tracked' | 'needs-attention' | 'today' | 'future'

interface DayStatusInput {
  dayType: DayType
  hasWorkedHours: boolean
  isoDate: string
  today: string
  hasAnyTrackedHours: boolean
}

export function getDayStatus({ dayType, hasWorkedHours, isoDate, today, hasAnyTrackedHours }: DayStatusInput): DayStatus {
  if (dayType !== 'WorkDay') return 'non-working'
  if (hasWorkedHours) return 'tracked'
  if (isoDate === today) return 'today'
  if (isoDate > today) return 'future'
  if (!hasAnyTrackedHours) return 'future'
  return 'needs-attention'
}
