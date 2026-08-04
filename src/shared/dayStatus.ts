import type { DayType } from '../features/day/dayType'

export type DayStatus = 'non-working' | 'leave' | 'future' | 'today' | 'complete' | 'needs-review' | 'untracked'

export interface ClassifyDayInput {
  dayType: DayType
  workedHours: number
  manualTotal: number
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
  /** For leave days: which kind of leave. Undefined for all other statuses. */
  leaveType?: 'Vacation' | 'SickDay'
}

const OVER_BOOKED_EPSILON = 0.01

function isOverBooked(workedHours: number, manualTotal: number): boolean {
  return manualTotal - workedHours > OVER_BOOKED_EPSILON
}

function balanceReason(workedHours: number, manualTotal: number): string {
  if (isOverBooked(workedHours, manualTotal)) {
    const over = manualTotal - workedHours
    return `${workedHours.toFixed(1)} h worked, ${manualTotal.toFixed(1)} h booked (${over.toFixed(1)} h over)`
  }
  return `${workedHours.toFixed(1)} h worked`
}

function classifyLeaveDay(dayType: DayType): DayClassification | null {
  if (dayType === 'Vacation' || dayType === 'SickDay') {
    const reason = dayType === 'Vacation' ? 'Marked as vacation' : 'Marked as sick day'
    return { status: 'leave', displayStatus: 'leave', reason, leaveType: dayType }
  }
  return null
}

function classifyNonWorkingDay(dayType: DayType): DayClassification | null {
  if (dayType !== 'WorkDay') {
    const reason = dayType === 'PublicHoliday' ? 'Public holiday' : 'Weekend'
    return { status: 'non-working', displayStatus: 'non-working', reason }
  }
  return null
}

function classifyTrackedDay(workedHours: number, manualTotal: number, isToday: boolean): DayClassification {
  const prefix = isToday ? 'Today — ' : ''
  const balance = balanceReason(workedHours, manualTotal)

  if (isOverBooked(workedHours, manualTotal)) {
    const status: DayStatus = isToday ? 'today' : 'needs-review'
    return { status, displayStatus: 'needs-review', reason: `${prefix}${balance}` }
  }
  const status: DayStatus = isToday ? 'today' : 'complete'
  return { status, displayStatus: 'complete', reason: `${prefix}${balance}` }
}

export function classifyDay({
  dayType,
  workedHours,
  manualTotal,
  isoDate,
  today,
}: ClassifyDayInput): DayClassification {
  const leaveResult = classifyLeaveDay(dayType)
  if (leaveResult) return leaveResult

  const nonWorkingResult = classifyNonWorkingDay(dayType)
  if (nonWorkingResult) return nonWorkingResult

  if (isoDate > today) {
    if (workedHours > 0) {
      return {
        status: 'complete',
        displayStatus: 'complete',
        reason: `${workedHours.toFixed(1)} h logged ahead of schedule`,
      }
    }
    return { status: 'future', displayStatus: 'future', reason: 'Future work day — no hours yet' }
  }

  const isToday = isoDate === today
  const prefix = isToday ? 'Today — ' : ''

  if (workedHours === 0 && manualTotal === 0) {
    const status: DayStatus = isToday ? 'today' : 'untracked'
    return { status, displayStatus: 'untracked', reason: `${prefix}No hours recorded` }
  }

  return classifyTrackedDay(workedHours, manualTotal, isToday)
}
