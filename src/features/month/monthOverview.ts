import type { DaySummary } from './daySummary'

export interface MonthOverviewDay {
  date: string
  dayOfMonth: number
  /** 1 = Mon … 7 = Sun */
  weekday: number
  workedHours: number
  targetHours: number
  /** worked − target, or null while nothing is knowable yet (future date, or nothing tracked). */
  balance: number | null
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

/** ISO-8601 week number of a local `YYYY-MM-DD` date. */
export function isoWeekOf(isoDate: string): number {
  const date = new Date(`${isoDate}T00:00:00`)
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function buildMonthOverview(input: MonthOverviewInput): MonthOverview {
  const weeks: MonthOverviewWeek[] = []

  input.days.forEach((summary, i) => {
    const date = new Date(`${summary.date}T00:00:00`)
    const isoWeek = isoWeekOf(summary.date)
    let week = weeks.at(-1)
    if (!week || week.isoWeek !== isoWeek) {
      week = { isoWeek, days: [], worked: 0, target: 0, balance: 0, isFuture: true }
      weeks.push(week)
    }
    if (summary.date <= input.today) week.isFuture = false
    const targetHours = input.targetHoursPerDay[i] ?? 0
    const hasBalance = summary.workedHours > 0 && summary.date <= input.today
    week.days.push({
      date: summary.date,
      dayOfMonth: date.getDate(),
      weekday: ((date.getDay() + 6) % 7) + 1,
      workedHours: summary.workedHours,
      targetHours,
      balance: hasBalance ? summary.workedHours - targetHours : null,
      fillPercent: targetHours > 0 ? Math.min(100, (summary.workedHours / targetHours) * 100) : 0,
      ...(summary.leaveType !== undefined ? { leaveType: summary.leaveType } : {}),
    })
    week.worked += summary.workedHours
    if (summary.workedHours > 0) week.target += input.targetHoursPerDay[i] ?? 0
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
