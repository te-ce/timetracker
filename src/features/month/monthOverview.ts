import type { DaySummary } from './daySummary'
import { isoWeekOf } from '../../shared/isoWeek'
import { calculateCumulativeOvertime } from '../../shared/overtime'

export interface MonthOverviewDay {
  date: string
  dayOfMonth: number
  /** 1 = Mon … 7 = Sun */
  weekday: number
  workedHours: number
  targetHours: number
  /** worked − target, or null while nothing is knowable yet (future date, or nothing tracked). */
  balance: number | null
  /** Cumulative over/undertime (incl. prior months) as of this day, or null while unknowable. */
  overtimeToDate: number | null
  /** Worked share of the day's target, 0–100. */
  fillPercent: number
  leaveType?: 'Vacation' | 'SickDay'
}

export interface MonthOverviewWeek {
  isoWeek: number
  days: MonthOverviewDay[]
  worked: number
  /** Target for tracked days only — the same rule the overtime math uses. */
  target: number
  balance: number
  /** Cumulative over/undertime (incl. prior months) as of the week's last known day, or null. */
  overtimeToDate: number | null
  /** Every day of the week is still to come, so its totals say nothing yet. */
  isFuture: boolean
}

export interface AttentionDay {
  date: string
  dayOfMonth: number
  weekdayShort: string
  reason: string
}

export interface MonthOverview {
  weeks: MonthOverviewWeek[]
  /** Past days that need work: nothing tracked, or tracked but not adding up. Date order. */
  attention: AttentionDay[]
  untrackedCount: number
  needsReviewCount: number
  /** Target hours of the untracked past days — what is missing from the month. */
  missingHours: number
  worked: number
  targetFullMonth: number
  /** Worked share of the full-month target, 0–100 (uncapped — an over-target month reads > 100). */
  workedPercent: number
  /** Share of the full-month target that is already due, 0–100 — the meter's notch. */
  targetToDatePercent: number
  /** Cumulative over/undertime including prior months, passed through for display. */
  cumulativeBalance: number
}

export interface MonthOverviewInput {
  days: DaySummary[]
  targetHoursPerDay: number[]
  today: string
  cumulativeBalance: number
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function buildMonthOverview(input: MonthOverviewInput): MonthOverview {
  const weeks: MonthOverviewWeek[] = []

  const cumulativeOvertime = calculateCumulativeOvertime(
    input.days.map((d) => d.workedHours),
    input.days.map((d) => d.date),
    input.targetHoursPerDay,
    input.today,
    undefined,
    input.cumulativeBalance,
  )

  function weekFor(isoWeek: number): MonthOverviewWeek {
    const last = weeks.at(-1)
    if (last?.isoWeek === isoWeek) return last
    const week: MonthOverviewWeek = {
      isoWeek,
      days: [],
      worked: 0,
      target: 0,
      balance: 0,
      overtimeToDate: null,
      isFuture: true,
    }
    weeks.push(week)
    return week
  }

  function buildDay(summary: DaySummary, targetHours: number, overtimeToDate: number | null): MonthOverviewDay {
    const date = new Date(`${summary.date}T00:00:00`)
    const hasBalance = summary.workedHours > 0 && summary.date <= input.today
    return {
      date: summary.date,
      dayOfMonth: date.getDate(),
      weekday: ((date.getDay() + 6) % 7) + 1,
      workedHours: summary.workedHours,
      targetHours,
      balance: hasBalance ? summary.workedHours - targetHours : null,
      overtimeToDate,
      fillPercent: targetHours > 0 ? Math.min(100, (summary.workedHours / targetHours) * 100) : 0,
      ...(summary.leaveType !== undefined ? { leaveType: summary.leaveType } : {}),
    }
  }

  input.days.forEach((summary, i) => {
    const week = weekFor(isoWeekOf(summary.date))
    if (summary.date <= input.today) week.isFuture = false
    const targetHours = input.targetHoursPerDay[i] ?? 0
    const overtimeToDate = cumulativeOvertime[i] ?? null
    week.days.push(buildDay(summary, targetHours, overtimeToDate))
    if (overtimeToDate !== null) week.overtimeToDate = overtimeToDate
    week.worked += summary.workedHours
    if (summary.workedHours > 0) week.target += targetHours
  })

  for (const week of weeks) week.balance = week.worked - week.target

  const worked = input.days.reduce((sum, d) => sum + d.workedHours, 0)
  const targetFullMonth = input.targetHoursPerDay.reduce((sum, h) => sum + h, 0)
  const targetToDate = input.days.reduce(
    (sum, d, i) => (d.date <= input.today ? sum + (input.targetHoursPerDay[i] ?? 0) : sum),
    0,
  )

  const attention: AttentionDay[] = []
  let untrackedCount = 0
  let needsReviewCount = 0
  let missingHours = 0
  input.days.forEach((summary, i) => {
    if (summary.date > input.today) return
    const isUntracked = summary.displayStatus === 'untracked'
    if (!isUntracked && summary.displayStatus !== 'needs-review') return
    if (isUntracked) {
      untrackedCount++
      missingHours += input.targetHoursPerDay[i] ?? 0
    } else {
      needsReviewCount++
    }
    const date = new Date(`${summary.date}T00:00:00`)
    attention.push({
      date: summary.date,
      dayOfMonth: date.getDate(),
      weekdayShort: WEEKDAY_SHORT[(date.getDay() + 6) % 7] ?? '',
      reason: isUntracked ? 'Nothing tracked' : summary.statusReason || 'Needs review',
    })
  })

  return {
    weeks,
    attention,
    untrackedCount,
    needsReviewCount,
    missingHours,
    worked,
    targetFullMonth,
    workedPercent: targetFullMonth > 0 ? (worked / targetFullMonth) * 100 : 0,
    targetToDatePercent: targetFullMonth > 0 ? (targetToDate / targetFullMonth) * 100 : 0,
    cumulativeBalance: input.cumulativeBalance,
  }
}
