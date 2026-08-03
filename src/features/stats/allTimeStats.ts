import type { MonthData, WorkLocation } from '../../infra/repositories/types'
import type { DayType } from '../day/dayType'
import { deriveMonthDayCores } from '../../shared/monthDayCore'
import { targetHoursForDate, type WeekdayHours } from '../../shared/weekdayHours'
import { UNCATEGORIZED_CATEGORY } from '../../shared/periodCategories'
import { calculateWorkedHours, parseMinutes } from '../../shared/worktime'
import { parseLocalDate } from '../../shared/dateUtils'

export interface StatsMonth {
  /** `YYYY-MM` */
  ym: string
  data: MonthData
}

export interface AllTimeStatsInput {
  months: StatsMonth[]
  weekdayHours: WeekdayHours
  today: string
  /** Wall-clock "HH:MM" today's still-running period is measured against. */
  now?: string
}

export interface DayRecord {
  date: string
  hours: number
}

export interface ClockRecord {
  date: string
  /** `HH:MM` */
  time: string
}

export interface PeriodRecord {
  date: string
  hours: number
  category: string
  start: string
  end: string
}

export interface WeekdayStat {
  /** 1 = Mon … 7 = Sun */
  weekday: number
  label: string
  hours: number
  trackedDays: number
  avgHours: number
}

export interface MonthStat {
  ym: string
  label: string
  hours: number
  trackedDays: number
  balance: number
}

export interface CategoryStat {
  category: string
  hours: number
  /** Share of all categorised hours, 0–100. */
  percent: number
}

export interface StreakStat {
  length: number
  from: string
  to: string
}

export interface LocationStats {
  officeDays: number
  remoteDays: number
  officePercent: number
}

export interface AllTimeStats {
  hasData: boolean
  totalHours: number
  trackedDays: number
  monthsTracked: number
  firstTrackedDate: string | null
  lastTrackedDate: string | null
  /** Worked − target over tracked days only, all months — the all-time over/undertime. */
  balance: number
  avgHoursPerTrackedDay: number
  longestDay: DayRecord | null
  shortestTrackedDay: DayRecord | null
  earliestStart: ClockRecord | null
  latestEnd: ClockRecord | null
  /** Mean first-start across tracked days, as minutes after midnight. */
  avgStartMinutes: number | null
  /** Mean last-end across tracked days that have a closed final period. */
  avgEndMinutes: number | null
  weekdays: WeekdayStat[]
  busiestWeekday: WeekdayStat | null
  months: MonthStat[]
  busiestMonth: MonthStat | null
  categories: CategoryStat[]
  periodCount: number
  avgPeriodsPerTrackedDay: number
  longestPeriod: PeriodRecord | null
  /** Tracked WorkDays in a row ending at (or just before) today. */
  currentStreak: number
  longestStreak: StreakStat | null
  location: LocationStats
  vacationDays: number
  sickDays: number
  /** Days tracked that were not WorkDays — weekends, holidays, leave. */
  daysWorkedOffSchedule: number
  daysAtOrOverTarget: number
  /** Calendar span from the first to the last tracked day, in days (inclusive). */
  calendarSpanDays: number
}

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** 1 = Mon … 7 = Sun, so weekday stats read Monday-first without re-sorting. */
function isoWeekday(iso: string): number {
  return ((parseLocalDate(iso).getDay() + 6) % 7) + 1
}

export function monthLabel(ym: string): string {
  const month = parseInt(ym.slice(5, 7))
  return `${MONTH_LABELS[month - 1] ?? ym} ${ym.slice(0, 4)}`
}

export function formatClock(minutes: number): string {
  const rounded = Math.round(minutes)
  return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`
}

/** True when `ym` is the calendar month right after `prev` — a gap breaks a streak. */
function isAdjacentMonth(prev: string, ym: string): boolean {
  const prevYear = parseInt(prev.slice(0, 4))
  const prevMonth = parseInt(prev.slice(5, 7))
  const nextMonth = prevMonth === 12 ? 1 : prevMonth + 1
  const nextYear = prevMonth === 12 ? prevYear + 1 : prevYear
  return ym === `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

interface DayFacts {
  date: string
  dayType: DayType
  hours: number
  targetHours: number
  categoryHours: Record<string, number>
  periodCount: number
  firstStartMinutes: number | null
  lastEndMinutes: number | null
  location: WorkLocation | undefined
  /** A month boundary was skipped before this day, so streaks must not span it. */
  afterGap: boolean
}

function flattenDays(input: AllTimeStatsInput): DayFacts[] {
  const sorted = [...input.months].sort((a, b) => a.ym.localeCompare(b.ym))
  const facts: DayFacts[] = []

  sorted.forEach((month, monthIdx) => {
    const year = parseInt(month.ym.slice(0, 4))
    const monthNumber = parseInt(month.ym.slice(5, 7))
    const prev = sorted[monthIdx - 1]
    const afterGap = monthIdx > 0 && prev !== undefined && !isAdjacentMonth(prev.ym, month.ym)

    const { days } = deriveMonthDayCores({
      year,
      month: monthNumber,
      monthData: month.data,
      weekdayHours: input.weekdayHours,
      today: input.today,
      ...(input.now !== undefined ? { todayNow: input.now } : {}),
    })

    days.forEach((core, dayIdx) => {
      const windows = month.data[core.date]?.windows ?? []
      const starts = windows.map((w) => parseMinutes(w.start))
      const ends = windows.flatMap((w) => (w.end === null ? [] : [parseMinutes(w.end)]))
      facts.push({
        date: core.date,
        dayType: core.dayType,
        hours: core.workedHours,
        targetHours: targetHoursForDate(core.date, input.weekdayHours),
        categoryHours: core.categoryHours,
        periodCount: windows.length,
        firstStartMinutes: starts.length > 0 ? Math.min(...starts) : null,
        lastEndMinutes: ends.length > 0 ? Math.max(...ends) : null,
        location: month.data[core.date]?.location,
        afterGap: afterGap && dayIdx === 0,
      })
    })
  })

  return facts
}

function longestPeriodOf(months: StatsMonth[]): PeriodRecord | null {
  let best: PeriodRecord | null = null
  for (const month of months) {
    for (const [date, day] of Object.entries(month.data)) {
      for (const period of day.windows) {
        if (period.end === null) continue
        const hours = calculateWorkedHours([period])
        if (best === null || hours > best.hours) {
          best = { date, hours, category: period.category, start: period.start, end: period.end }
        }
      }
    }
  }
  return best
}

/**
 * Longest run of consecutive tracked WorkDays. Non-WorkDays (weekends,
 * holidays, leave) neither extend nor break a run — they are skipped — so a
 * normal Mon–Fri week reads as a 5-day streak, and two of them as 10.
 */
function computeLongestStreak(days: DayFacts[]): StreakStat | null {
  let best: StreakStat | null = null
  let length = 0
  let from = ''
  let last = ''

  for (const day of days) {
    if (day.afterGap) length = 0
    if (day.dayType !== 'WorkDay') continue
    if (day.hours > 0) {
      if (length === 0) from = day.date
      length++
      last = day.date
      if (best === null || length > best.length) best = { length, from, to: last }
    } else {
      length = 0
    }
  }

  return best
}

/**
 * Tracked WorkDays in a row up to today. Today counts when it has hours and is
 * skipped when it does not — an untracked morning should not read as a broken
 * streak.
 */
function computeCurrentStreak(days: DayFacts[], today: string): number {
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i]
    if (day === undefined || day.date > today) continue
    if (day.date === today && day.hours === 0) continue
    if (day.dayType !== 'WorkDay') {
      if (day.afterGap) break
      continue
    }
    if (day.hours === 0) break
    streak++
    if (day.afterGap) break
  }
  return streak
}

function buildWeekdayStats(trackedDays: DayFacts[]): WeekdayStat[] {
  return WEEKDAY_LABELS.map((label, i) => {
    const weekday = i + 1
    const forDay = trackedDays.filter((d) => isoWeekday(d.date) === weekday)
    const hours = forDay.reduce((sum, d) => sum + d.hours, 0)
    return {
      weekday,
      label,
      hours,
      trackedDays: forDay.length,
      avgHours: forDay.length > 0 ? hours / forDay.length : 0,
    }
  })
}

function buildMonthStats(days: DayFacts[]): MonthStat[] {
  const byMonth = new Map<string, DayFacts[]>()
  for (const day of days) {
    const ym = day.date.slice(0, 7)
    const bucket = byMonth.get(ym)
    if (bucket) bucket.push(day)
    else byMonth.set(ym, [day])
  }
  return [...byMonth.entries()]
    .map(([ym, monthDays]) => {
      const tracked = monthDays.filter((d) => d.hours > 0)
      const hours = tracked.reduce((sum, d) => sum + d.hours, 0)
      return {
        ym,
        label: monthLabel(ym),
        hours,
        trackedDays: tracked.length,
        balance: hours - tracked.reduce((sum, d) => sum + d.targetHours, 0),
      }
    })
    .filter((m) => m.trackedDays > 0)
    .sort((a, b) => a.ym.localeCompare(b.ym))
}

function buildCategoryStats(trackedDays: DayFacts[]): CategoryStat[] {
  const totals = new Map<string, number>()
  for (const day of trackedDays) {
    for (const [category, hours] of Object.entries(day.categoryHours)) {
      if (category === UNCATEGORIZED_CATEGORY) continue
      totals.set(category, (totals.get(category) ?? 0) + hours)
    }
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0)
  return [...totals.entries()]
    .map(([category, hours]) => ({ category, hours, percent: sum > 0 ? (hours / sum) * 100 : 0 }))
    .sort((a, b) => b.hours - a.hours)
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Every all-time figure the Stats view shows, derived from whole months of
 * stored data. Days with no tracked hours are excluded from averages and from
 * the balance — the same "tracked days only" rule the month overtime math uses.
 */
export function buildAllTimeStats(input: AllTimeStatsInput): AllTimeStats {
  const days = flattenDays(input)
  const tracked = days.filter((d) => d.hours > 0)
  const totalHours = tracked.reduce((sum, d) => sum + d.hours, 0)
  const targetOfTracked = tracked.reduce((sum, d) => sum + d.targetHours, 0)

  const sortedByHours = [...tracked].sort((a, b) => b.hours - a.hours)
  const longest = sortedByHours[0]
  const shortest = sortedByHours.at(-1)

  const starts = tracked.map((d) => d.firstStartMinutes).filter(isDefined)
  const ends = tracked.map((d) => d.lastEndMinutes).filter(isDefined)
  const earliestStartDay = tracked
    .filter((d) => d.firstStartMinutes !== null)
    .sort((a, b) => (a.firstStartMinutes ?? 0) - (b.firstStartMinutes ?? 0))[0]
  const latestEndDay = tracked
    .filter((d) => d.lastEndMinutes !== null)
    .sort((a, b) => (b.lastEndMinutes ?? 0) - (a.lastEndMinutes ?? 0))[0]

  const weekdays = buildWeekdayStats(tracked)
  const busiestWeekday = [...weekdays].filter((w) => w.trackedDays > 0).sort((a, b) => b.hours - a.hours)[0] ?? null
  const months = buildMonthStats(days)
  const busiestMonth = [...months].sort((a, b) => b.hours - a.hours)[0] ?? null

  const officeDays = tracked.filter((d) => d.location === 'Office').length
  const remoteDays = tracked.filter((d) => d.location !== 'Office').length
  const firstTrackedDate = tracked[0]?.date ?? null
  const lastTrackedDate = tracked.at(-1)?.date ?? null

  return {
    hasData: tracked.length > 0,
    totalHours,
    trackedDays: tracked.length,
    monthsTracked: months.length,
    firstTrackedDate,
    lastTrackedDate,
    balance: totalHours - targetOfTracked,
    avgHoursPerTrackedDay: tracked.length > 0 ? totalHours / tracked.length : 0,
    longestDay: longest ? { date: longest.date, hours: longest.hours } : null,
    shortestTrackedDay: shortest ? { date: shortest.date, hours: shortest.hours } : null,
    earliestStart: earliestStartDay
      ? { date: earliestStartDay.date, time: formatClock(earliestStartDay.firstStartMinutes ?? 0) }
      : null,
    latestEnd: latestEndDay ? { date: latestEndDay.date, time: formatClock(latestEndDay.lastEndMinutes ?? 0) } : null,
    avgStartMinutes: mean(starts),
    avgEndMinutes: mean(ends),
    weekdays,
    busiestWeekday,
    months,
    busiestMonth,
    categories: buildCategoryStats(tracked),
    periodCount: tracked.reduce((sum, d) => sum + d.periodCount, 0),
    avgPeriodsPerTrackedDay:
      tracked.length > 0 ? tracked.reduce((sum, d) => sum + d.periodCount, 0) / tracked.length : 0,
    longestPeriod: longestPeriodOf(input.months),
    currentStreak: computeCurrentStreak(days, input.today),
    longestStreak: computeLongestStreak(days),
    location: {
      officeDays,
      remoteDays,
      officePercent: tracked.length > 0 ? Math.round((officeDays / tracked.length) * 100) : 0,
    },
    vacationDays: days.filter((d) => d.dayType === 'Vacation').length,
    sickDays: days.filter((d) => d.dayType === 'SickDay').length,
    daysWorkedOffSchedule: tracked.filter((d) => d.dayType !== 'WorkDay').length,
    daysAtOrOverTarget: tracked.filter((d) => d.targetHours > 0 && d.hours >= d.targetHours).length,
    calendarSpanDays:
      firstTrackedDate !== null && lastTrackedDate !== null
        ? Math.round(
            (parseLocalDate(lastTrackedDate).getTime() - parseLocalDate(firstTrackedDate).getTime()) / 86400000,
          ) + 1
        : 0,
  }
}
