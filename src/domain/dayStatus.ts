import type { DayType } from './dayType'

export type DayStatus =
  | 'non-working'
  | 'leave'
  | 'future'
  | 'today'
  | 'tracked'
  | 'confirmed'
  | 'needs-review'
  | 'untracked'

export type WorkStatus = Exclude<DayStatus, 'today' | 'future'>

export interface ClassifyDayInput {
  dayType: DayType
  workedHours: number
  manualTotal: number
  isEntriesBalanced: boolean
  hasAutoCategory: boolean
  isConfirmed: boolean
  isoDate: string
  today: string
}

export interface DayClassification {
  /** Full status including 'today' and 'future' — for calendar dot logic. */
  status: DayStatus
  /** Status with 'today' resolved to the underlying work quality — for badges and grid dots. */
  displayStatus: Exclude<DayStatus, 'today'>
  /** Human-readable explanation of the status. */
  reason: string
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

export function classifyDay({
  dayType,
  workedHours,
  manualTotal,
  isEntriesBalanced,
  hasAutoCategory,
  isConfirmed,
  isoDate,
  today,
}: ClassifyDayInput): DayClassification {
  const hasWorkedHours = workedHours > 0
  const hasManualEntries = manualTotal > 0

  // Leave days
  if (dayType === 'Vacation' || dayType === 'SickDay' || dayType === 'Absence') {
    const leaveLabel =
      dayType === 'Vacation'
        ? 'Marked as vacation'
        : dayType === 'SickDay'
          ? 'Marked as sick day'
          : 'Marked as absence'
    return { status: 'leave', displayStatus: 'leave', reason: leaveLabel }
  }

  // Non-working (Weekend, PublicHoliday)
  if (dayType !== 'WorkDay') {
    const label = dayType === 'PublicHoliday' ? 'Public holiday' : 'Weekend'
    return { status: 'non-working', displayStatus: 'non-working', reason: label }
  }

  // Future days
  if (isoDate > today) {
    if (hasWorkedHours) {
      return {
        status: 'tracked',
        displayStatus: 'tracked',
        reason: `${workedHours.toFixed(1)} h logged ahead of schedule`,
      }
    }
    return { status: 'future', displayStatus: 'untracked', reason: 'Future work day — no hours yet' }
  }

  const isToday = isoDate === today
  const prefix = isToday ? 'Today — ' : ''

  if (!hasWorkedHours && !hasManualEntries) {
    const status: DayStatus = isToday ? 'today' : 'untracked'
    return { status, displayStatus: 'untracked', reason: `${prefix}No hours recorded` }
  }

  const balance = balanceReason(workedHours, manualTotal, hasAutoCategory)

  if (isConfirmed) {
    const status: DayStatus = isToday ? 'today' : 'confirmed'
    return { status, displayStatus: 'confirmed', reason: `${prefix}Confirmed — ${balance}` }
  }

  if (isEntriesBalanced) {
    const status: DayStatus = isToday ? 'today' : 'tracked'
    return { status, displayStatus: 'tracked', reason: `${prefix}${balance}` }
  }

  const status: DayStatus = isToday ? 'today' : 'needs-review'
  return { status, displayStatus: 'needs-review', reason: `${prefix}${balance}` }
}
