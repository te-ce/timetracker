import type { DayType } from './dayType'

export type DayStatus = 'non-working' | 'leave' | 'future' | 'today' | 'tracked' | 'confirmed' | 'needs-review' | 'untracked'

export interface StatusReasonInput {
  dayType: DayType
  workedHours: number
  manualTotal: number
  hasAutoCategory: boolean
  isConfirmed: boolean
  isoDate: string
  today: string
}

function balanceReason(workedHours: number, manualTotal: number, hasAutoCategory: boolean): string {
  if (workedHours === 0 && manualTotal > 0) {
    return `${manualTotal.toFixed(1)} h categorized but no work time recorded`
  }
  if (Math.abs(workedHours - manualTotal) < 0.01) {
    return `${workedHours.toFixed(1)} h worked and fully categorized`
  }
  if (hasAutoCategory && manualTotal <= workedHours) {
    const auto = workedHours - manualTotal
    return `${workedHours.toFixed(1)} h worked — auto-category fills ${auto.toFixed(1)} h`
  }
  if (manualTotal > workedHours) {
    const over = manualTotal - workedHours
    return `${workedHours.toFixed(1)} h worked, ${manualTotal.toFixed(1)} h booked (${over.toFixed(1)} h over)`
  }
  const unaccounted = workedHours - manualTotal
  return `${workedHours.toFixed(1)} h worked, ${manualTotal.toFixed(1)} h categorized — ${unaccounted.toFixed(1)} h unaccounted`
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

  const prefix = isoDate === today ? 'Today — ' : ''

  if (workedHours === 0 && manualTotal === 0) {
    return `${prefix}No hours recorded`
  }

  const balance = balanceReason(workedHours, manualTotal, hasAutoCategory)

  if (isConfirmed) {
    return `${prefix}Confirmed — ${balance}`
  }

  return `${prefix}${balance}`
}

export type WorkStatus = Exclude<DayStatus, 'today' | 'future'>

interface WorkStatusInput {
  dayType: DayType
  hasWorkedHours: boolean
  hasManualEntries: boolean
  isEntriesBalanced: boolean
  isConfirmed?: boolean
}

export function getWorkStatus({
  dayType,
  hasWorkedHours,
  hasManualEntries,
  isEntriesBalanced,
  isConfirmed = false,
}: WorkStatusInput): WorkStatus {
  if (dayType === 'Vacation' || dayType === 'SickDay' || dayType === 'Absence') return 'leave'
  if (dayType !== 'WorkDay') return 'non-working'
  if (!hasWorkedHours && !hasManualEntries) return 'untracked'
  if (isConfirmed) return 'confirmed'
  if (isEntriesBalanced) return 'tracked'
  return 'needs-review'
}

interface DayStatusInput {
  dayType: DayType
  hasWorkedHours: boolean
  hasManualEntries: boolean
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  isConfirmed?: boolean
  isoDate: string
  today: string
}

export function getDayStatus({
  dayType,
  hasWorkedHours,
  hasManualEntries,
  isEntriesBalanced,
  isConfirmed = false,
  isoDate,
  today,
}: DayStatusInput): DayStatus {
  // Leave days (Vacation, SickDay, Absence)
  if (dayType === 'Vacation' || dayType === 'SickDay' || dayType === 'Absence') return 'leave'

  // Non-working (Weekend, PublicHoliday)
  if (dayType !== 'WorkDay') return 'non-working'

  // Future days
  if (isoDate > today) return hasWorkedHours ? 'tracked' : 'future'

  // Today
  if (isoDate === today) return 'today'

  // Past work days
  if (!hasWorkedHours && !hasManualEntries) return 'untracked'

  if (isConfirmed) return 'confirmed'
  if (isEntriesBalanced) return 'tracked'
  return 'needs-review'
}
