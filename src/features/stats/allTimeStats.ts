import type { MonthData, WorkLocation, WorkPeriod } from '../../infra/repositories/types'
import type { DayType } from '../day/dayType'
import { deriveMonthDayCores } from '../../shared/monthDayCore'
import { targetHoursForDate, type WeekdayHours } from '../../shared/weekdayHours'
import { UNCATEGORIZED_CATEGORY } from '../../shared/periodCategories'
import { calculateWorkedHours, parseMinutes } from '../../shared/worktime'
import { parseLocalDate } from '../../shared/dateUtils'
import { isoWeekOf, isoWeekYearOf } from '../../shared/isoWeek'

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

export interface RhythmStats {
  /** Quarter-hour slot you start in most often, e.g. "08:00". */
  mostCommonStartSlot: string | null
  mostCommonStartCount: number
  /** Mean absolute deviation of the first start from the average start, in minutes. */
  startSpreadMinutes: number | null
  /** Tracked days whose first period began before 08:00. */
  earlyStarts: number
  /** Tracked days whose last period ended at 18:00 or later. */
  lateFinishes: number
}

export interface BreakStats {
  avgMinutesPerDay: number
  longestWithinDay: { date: string; minutes: number } | null
  /** Tracked days logged as a single unbroken period. */
  daysWithoutBreak: number
}

export interface WeekStat {
  isoWeek: number
  isoYear: number
  label: string
  hours: number
  trackedDays: number
}

export interface WeekStats {
  bestWeek: WeekStat | null
}

export interface ExtremeStats {
  bestDayBalance: { date: string; balance: number } | null
  worstDayBalance: { date: string; balance: number } | null
  medianDayHours: number
  weekendHours: number
  /** Longest run of untracked WorkDays in the past — the longest stretch away. */
  longestAbsence: { workdays: number; from: string; to: string } | null
}

export interface DisciplineStats {
  daysWithNotes: number
  subtaskCount: number
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
  longestPeriod: PeriodRecord | null
  longestStreak: StreakStat | null
  location: LocationStats
  rhythm: RhythmStats
  breaks: BreakStats
  weeks: WeekStats
  extremes: ExtremeStats
  discipline: DisciplineStats
  /** Hours still to go until the next whole 100 tracked hours. */
  hoursToNextMilestone: number
  /** Next whole-100 hours mark, e.g. 500 while sitting on 412h. */
  nextMilestone: number
  /** Days since the first tracked day, inclusive — how long tracking has been going. */
  trackingSinceDays: number
  vacationDays: number
  sickDays: number
  /** Days tracked that were not WorkDays — weekends, holidays, leave. */
  daysWorkedOffSchedule: number
}

const LEAVE_DAY_TYPES = new Set<DayType>(['Vacation', 'SickDay'])

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
  confirmed: boolean
  hasNote: boolean
  subtaskCount: number
  /** Minutes between consecutive periods — time on the clock but not on a task. */
  breakMinutes: number
  longestBreakMinutes: number
  /** A month boundary was skipped before this day, so streaks must not span it. */
  afterGap: boolean
}

/** Gaps between consecutive closed periods: total and largest, in minutes. */
function breaksBetween(windows: WorkPeriod[]): { total: number; longest: number } {
  const closed = windows
    .filter((w) => w.end !== null)
    .map((w) => ({ start: parseMinutes(w.start), end: parseMinutes(w.end ?? '00:00') }))
    .sort((a, b) => a.start - b.start)

  let total = 0
  let longest = 0
  for (let i = 1; i < closed.length; i++) {
    const prev = closed[i - 1]
    const current = closed[i]
    if (prev === undefined || current === undefined) continue
    const gap = current.start - prev.end
    if (gap <= 0) continue
    total += gap
    longest = Math.max(longest, gap)
  }
  return { total, longest }
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
      const day = month.data[core.date]
      const windows = day?.windows ?? []
      const starts = windows.map((w) => parseMinutes(w.start))
      const ends = windows.flatMap((w) => (w.end === null ? [] : [parseMinutes(w.end)]))
      const breaks = breaksBetween(windows)
      facts.push({
        date: core.date,
        dayType: core.dayType,
        hours: core.workedHours,
        targetHours: targetHoursForDate(core.date, input.weekdayHours),
        categoryHours: core.categoryHours,
        periodCount: windows.length,
        firstStartMinutes: starts.length > 0 ? Math.min(...starts) : null,
        lastEndMinutes: ends.length > 0 ? Math.max(...ends) : null,
        location: day?.location,
        confirmed: day?.confirmed === true,
        hasNote: (day?.note ?? '').trim().length > 0,
        subtaskCount: windows.reduce((sum, w) => sum + w.subtasks.length, 0),
        breakMinutes: breaks.total,
        longestBreakMinutes: breaks.longest,
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
 * Longest run of consecutive tracked WorkDays. Weekends and public holidays are
 * skipped — they neither extend nor break a run — so a normal Mon–Fri week
 * reads as a 5-day streak and two of them as 10. Vacation and sick days do
 * break it: the point of the streak is uninterrupted working days.
 */
function computeLongestStreak(days: DayFacts[]): StreakStat | null {
  let best: StreakStat | null = null
  let length = 0
  let from = ''
  let last = ''

  for (const day of days) {
    if (day.afterGap) length = 0
    if (LEAVE_DAY_TYPES.has(day.dayType)) {
      length = 0
      continue
    }
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

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

const QUARTER_HOUR = 15
const EARLY_START_MINUTES = 8 * 60
const LATE_FINISH_MINUTES = 18 * 60

function buildRhythmStats(tracked: DayFacts[]): RhythmStats {
  const starts = tracked.map((d) => d.firstStartMinutes).filter(isDefined)
  const slots = new Map<number, number>()
  for (const start of starts) {
    const slot = Math.round(start / QUARTER_HOUR) * QUARTER_HOUR
    slots.set(slot, (slots.get(slot) ?? 0) + 1)
  }
  // Ties go to the earlier slot, so the answer doesn't depend on Map order.
  const topSlot = [...slots.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]
  const avgStart = mean(starts)

  return {
    mostCommonStartSlot: topSlot ? formatClock(topSlot[0]) : null,
    mostCommonStartCount: topSlot?.[1] ?? 0,
    startSpreadMinutes: avgStart === null ? null : (mean(starts.map((s) => Math.abs(s - avgStart))) ?? null),
    earlyStarts: starts.filter((s) => s < EARLY_START_MINUTES).length,
    lateFinishes: tracked.filter((d) => (d.lastEndMinutes ?? 0) >= LATE_FINISH_MINUTES).length,
  }
}

function buildBreakStats(tracked: DayFacts[]): BreakStats {
  const longest = [...tracked].sort((a, b) => b.longestBreakMinutes - a.longestBreakMinutes)[0]
  return {
    avgMinutesPerDay: mean(tracked.map((d) => d.breakMinutes)) ?? 0,
    longestWithinDay:
      longest && longest.longestBreakMinutes > 0 ? { date: longest.date, minutes: longest.longestBreakMinutes } : null,
    daysWithoutBreak: tracked.filter((d) => d.periodCount === 1).length,
  }
}

function buildWeekStats(days: DayFacts[]): WeekStats {
  const byWeek = new Map<string, DayFacts[]>()
  for (const day of days) {
    const key = `${isoWeekYearOf(day.date)}-${String(isoWeekOf(day.date)).padStart(2, '0')}`
    const bucket = byWeek.get(key)
    if (bucket) bucket.push(day)
    else byWeek.set(key, [day])
  }

  const weeks: WeekStat[] = []
  for (const [key, weekDays] of byWeek) {
    const hours = weekDays.reduce((sum, d) => sum + d.hours, 0)
    const isoYear = parseInt(key.slice(0, 4))
    const isoWeek = parseInt(key.slice(5))
    if (hours > 0) {
      weeks.push({
        isoWeek,
        isoYear,
        label: `Week ${isoWeek}, ${isoYear}`,
        hours,
        trackedDays: weekDays.filter((d) => d.hours > 0).length,
      })
    }
  }

  return { bestWeek: [...weeks].sort((a, b) => b.hours - a.hours)[0] ?? null }
}

/** Longest run of past WorkDays with nothing tracked — the longest stretch away. */
function longestAbsenceOf(days: DayFacts[], today: string): ExtremeStats['longestAbsence'] {
  let best: ExtremeStats['longestAbsence'] = null
  let workdays = 0
  let from = ''
  let last = ''

  for (const day of days) {
    if (day.afterGap) workdays = 0
    if (day.date > today || day.dayType !== 'WorkDay') continue
    if (day.hours > 0) {
      workdays = 0
      continue
    }
    if (workdays === 0) from = day.date
    workdays++
    last = day.date
    if (best === null || workdays > best.workdays) best = { workdays, from, to: last }
  }

  return best
}

function buildExtremeStats(days: DayFacts[], tracked: DayFacts[], today: string): ExtremeStats {
  const byBalance = [...tracked].sort((a, b) => b.hours - b.targetHours - (a.hours - a.targetHours))
  const best = byBalance[0]
  const worst = byBalance.at(-1)
  const isWeekend = (day: DayFacts) => isoWeekday(day.date) >= 6

  return {
    bestDayBalance: best ? { date: best.date, balance: best.hours - best.targetHours } : null,
    worstDayBalance: worst ? { date: worst.date, balance: worst.hours - worst.targetHours } : null,
    medianDayHours: median(tracked.map((d) => d.hours)),
    weekendHours: tracked.filter(isWeekend).reduce((sum, d) => sum + d.hours, 0),
    longestAbsence: longestAbsenceOf(days, today),
  }
}

function buildDisciplineStats(days: DayFacts[]): DisciplineStats {
  return {
    daysWithNotes: days.filter((d) => d.hasNote).length,
    subtaskCount: days.reduce((sum, d) => sum + d.subtaskCount, 0),
  }
}

const MILESTONE_STEP = 100

/** The next whole-100 hours mark strictly above `hours`. */
function nextMilestoneAbove(hours: number): number {
  return (Math.floor(hours / MILESTONE_STEP) + 1) * MILESTONE_STEP
}

/** Calendar days from `from` to `to`, both counted. */
function inclusiveDaysBetween(from: string, to: string): number {
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86400000) + 1
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
    longestPeriod: longestPeriodOf(input.months),
    longestStreak: computeLongestStreak(days),
    location: {
      officeDays,
      remoteDays,
      officePercent: tracked.length > 0 ? Math.round((officeDays / tracked.length) * 100) : 0,
    },
    rhythm: buildRhythmStats(tracked),
    breaks: buildBreakStats(tracked),
    weeks: buildWeekStats(days),
    extremes: buildExtremeStats(days, tracked, input.today),
    discipline: buildDisciplineStats(days),
    hoursToNextMilestone: nextMilestoneAbove(totalHours) - totalHours,
    nextMilestone: nextMilestoneAbove(totalHours),
    trackingSinceDays: firstTrackedDate !== null ? inclusiveDaysBetween(firstTrackedDate, input.today) : 0,
    vacationDays: days.filter((d) => d.dayType === 'Vacation').length,
    sickDays: days.filter((d) => d.dayType === 'SickDay').length,
    daysWorkedOffSchedule: tracked.filter((d) => d.dayType !== 'WorkDay').length,
  }
}
