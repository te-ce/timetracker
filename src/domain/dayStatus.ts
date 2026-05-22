import type { DayType } from './dayType'

export type DayStatus = 'non-working' | 'leave' | 'future' | 'today' | 'complete' | 'needs-review' | 'untracked'

export interface StatusReasonInput {
  dayType: DayType
  workedHours: number
  manualTotal: number
  hasAutoCategory: boolean
  isConfirmed: boolean
  isoDate: string
  today: string
}

export function getStatusReason({
  dayType,
  workedHours,
  manualTotal,
  hasAutoCategory,
  isConfirmed,
  isoDate,
  today,
}: StatusReasonInput): string {
  if (dayType === 'Vacation') return 'Marked as vacation'
  if (dayType === 'SickDay') return 'Marked as sick day'
  if (dayType === 'Absence') return 'Marked as absence'
  if (dayType === 'PublicHoliday') return 'Public holiday'
  if (dayType === 'Weekend') return 'Weekend'

  if (isoDate > today) {
    return workedHours > 0
      ? `${workedHours.toFixed(1)} h logged ahead of schedule`
      : 'Future work day — no hours yet'
  }

  if (isoDate === today) {
    if (workedHours === 0) return 'Today — no hours logged yet'
    if (isConfirmed) return `Today — confirmed (${workedHours.toFixed(1)} h worked)`
    if (Math.abs(workedHours - manualTotal) < 0.01) return `Today — ${workedHours.toFixed(1)} h worked and balanced`
    if (hasAutoCategory) {
      const auto = workedHours - manualTotal
      return `Today — ${workedHours.toFixed(1)} h worked, auto-category fills ${auto.toFixed(1)} h`
    }
    return `Today — ${workedHours.toFixed(1)} h worked, ${manualTotal.toFixed(1)} h categorized`
  }

  // Past WorkDay
  if (workedHours === 0) return 'No work hours logged'
  if (isConfirmed) return `Confirmed — ${workedHours.toFixed(1)} h worked`
  if (Math.abs(workedHours - manualTotal) < 0.01) return `${workedHours.toFixed(1)} h worked and fully categorized`
  if (hasAutoCategory) {
    const auto = workedHours - manualTotal
    return `${workedHours.toFixed(1)} h worked — auto-category fills ${auto.toFixed(1)} h`
  }
  const unaccounted = workedHours - manualTotal
  return `${workedHours.toFixed(1)} h worked, ${manualTotal.toFixed(1)} h categorized — ${Math.abs(unaccounted).toFixed(1)} h unaccounted`
}

interface DayStatusInput {
  dayType: DayType
  hasWorkedHours: boolean
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  isConfirmed?: boolean
  isoDate: string
  today: string
}

export function getDayStatus({
  dayType,
  hasWorkedHours,
  isEntriesBalanced,
  hasAutoCategory,
  isConfirmed = false,
  isoDate,
  today,
}: DayStatusInput): DayStatus {
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
