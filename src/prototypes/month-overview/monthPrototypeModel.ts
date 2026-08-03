// PROTOTYPE — throwaway month-overview exploration. Derives one flat view-model from the
// real MonthView data so the three variants can disagree about layout, not about numbers.
import { getAllCategories } from '../../shared/categories'
import { formatHours } from '../../shared/formatHours'
import type { TimeFormat } from '../../shared/timeFormatStore'
import { officeStats, type OfficeStats } from '../../shared/officeStats'
import type { MonthView } from '../../shared/useMonthView'
import type { DayStatus } from '../../shared/dayStatus'
import type { DisplayStatus } from '../../shared/statusColors'
import type { WorkLocation } from '../../infra/repositories/types'
import type { DayType } from '../../features/day/dayType'

export type MonthViewData = MonthView & { isOvertimeReady: boolean }

export interface PrototypeDay {
  date: string
  dayOfMonth: number
  /** 1 = Mon … 7 = Sun */
  weekday: number
  weekdayShort: string
  isToday: boolean
  isFuture: boolean
  isWeekend: boolean
  dayType: DayType
  dayStatus: DayStatus
  displayStatus: DisplayStatus
  statusReason: string
  workedHours: number
  targetHours: number
  /** worked − target, null when nothing is knowable yet (future / untracked). */
  balance: number | null
  /** Running over/undertime including prior months, null for future days. */
  accumulated: number | null
  categoryBreakdown: Record<string, number>
  location: WorkLocation | undefined
  note: string | undefined
  isConfirmed: boolean
  leaveType: 'Vacation' | 'SickDay' | undefined
}

export interface PrototypeWeek {
  key: string
  isoWeek: number
  days: PrototypeDay[]
  worked: number
  target: number
  balance: number
}

export interface CategorySlice {
  name: string
  hours: number
  percent: number
  /** Tailwind bg class — for DOM marks. */
  bg: string
  /** hex — for SVG marks. */
  fill: string
}

export interface PrototypeModel {
  year: number
  month: number
  monthLabel: string
  days: PrototypeDay[]
  weeks: PrototypeWeek[]
  today: PrototypeDay | undefined
  worked: number
  /** Target for tracked days only — matches how the app computes overtime. */
  targetTracked: number
  targetFullMonth: number
  monthBalance: number
  /** Carry-over + this month to date. */
  cumulativeBalance: number
  isOvertimeReady: boolean
  needsReview: PrototypeDay[]
  untrackedPast: PrototypeDay[]
  unconfirmed: PrototypeDay[]
  missingHours: number
  categories: CategorySlice[]
  /** Raw category name → Tailwind bg class, stable across months. */
  categoryBgOf: Record<string, string>
  office: OfficeStats
  maxDayHours: number
  weekdayAverages: { weekdayShort: string; average: number }[]
  leaveDays: PrototypeDay[]
}

// Fixed categorical order, validated for CVD separation (deutan ΔE 14.0 worst adjacent pair).
const CATEGORY_SLOTS = [
  { bg: 'bg-indigo-500', fill: '#6366f1' },
  { bg: 'bg-amber-500', fill: '#f59e0b' },
  { bg: 'bg-teal-500', fill: '#14b8a6' },
  { bg: 'bg-fuchsia-500', fill: '#d946ef' },
] as const
const OTHER_SLOT = { bg: 'bg-slate-400', fill: '#94a3b8' } as const

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Signed over/undertime, e.g. "+1:30" / "−0:45". */
export function formatSigned(hours: number, format: TimeFormat): string {
  if (Math.abs(hours) < 0.005) return formatHours(0, format)
  const sign = hours > 0 ? '+' : '−'
  return `${sign}${formatHours(Math.abs(hours), format)}`
}

export function balanceInk(balance: number): string {
  if (Math.abs(balance) < 0.005) return 'text-gray-500 dark:text-gray-400'
  return balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
}

function isoWeekOf(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function categoryLabel(name: string): string {
  if (name === '_LEAVE') return 'Leave'
  if (name === '_OTHER') return 'Other'
  return name
}

/** Colour follows the category's position in the user's configured order, never its share this month. */
function buildCategories(
  days: PrototypeDay[],
  orderedNames: string[],
): { slices: CategorySlice[]; bgOf: Record<string, string> } {
  const totals = new Map<string, number>()
  for (const day of days) {
    for (const [cat, hours] of Object.entries(day.categoryBreakdown)) {
      totals.set(cat, (totals.get(cat) ?? 0) + hours)
    }
  }
  const total = [...totals.values()].reduce((s, h) => s + h, 0)
  if (total <= 0) return { slices: [], bgOf: {} }

  // Slots go to the categories actually used this month, in the user's configured order —
  // otherwise every custom category sits past slot 4 (the built-ins fill the order first)
  // and the whole month renders in the "Rest" grey.
  const usedInOrder = [...totals.keys()].sort((a, b) => orderedNames.indexOf(a) - orderedNames.indexOf(b))
  const slotFor = (name: string) => CATEGORY_SLOTS[usedInOrder.indexOf(name)]

  const slices: CategorySlice[] = []
  const bgOf: Record<string, string> = {}
  let restHours = 0
  for (const name of usedInOrder) {
    const hours = totals.get(name) ?? 0
    const slot = slotFor(name)
    bgOf[name] = (slot ?? OTHER_SLOT).bg
    if (!slot) {
      restHours += hours
      continue
    }
    slices.push({ name: categoryLabel(name), hours, percent: (hours / total) * 100, ...slot })
  }
  if (restHours > 0) {
    slices.push({ name: 'Rest', hours: restHours, percent: (restHours / total) * 100, ...OTHER_SLOT })
  }
  return { slices, bgOf }
}

function groupIntoWeeks(days: PrototypeDay[]): PrototypeWeek[] {
  const weeks: PrototypeWeek[] = []
  for (const day of days) {
    const isoWeek = isoWeekOf(new Date(`${day.date}T00:00:00`))
    let week = weeks.at(-1)
    if (!week || week.isoWeek !== isoWeek) {
      week = { key: `${day.date}-w${isoWeek}`, isoWeek, days: [], worked: 0, target: 0, balance: 0 }
      weeks.push(week)
    }
    week.days.push(day)
    week.worked += day.workedHours
    if (day.workedHours > 0) week.target += day.targetHours
  }
  for (const week of weeks) week.balance = week.worked - week.target
  return weeks
}

export function buildPrototypeModel(view: MonthViewData): PrototypeModel {
  const { year, month, summaries, targetHoursPerDay, rows, workLocations, dayNotes, todayIso, config } = view
  const accumulatedByDate = new Map(rows.map((r) => [r.date, r.accumulatedOvertime]))

  const days: PrototypeDay[] = summaries.days.map((summary, i) => {
    const date = new Date(`${summary.date}T00:00:00`)
    const weekday = ((date.getDay() + 6) % 7) + 1
    const targetHours = targetHoursPerDay[i] ?? 0
    const isFuture = summary.date > todayIso
    return {
      date: summary.date,
      dayOfMonth: date.getDate(),
      weekday,
      weekdayShort: WEEKDAY_SHORT[weekday - 1] ?? '',
      isToday: summary.date === todayIso,
      isFuture,
      isWeekend: weekday >= 6,
      dayType: summary.dayType,
      dayStatus: summary.dayStatus,
      displayStatus: summary.displayStatus,
      statusReason: summary.statusReason,
      workedHours: summary.workedHours,
      targetHours,
      balance: isFuture || summary.workedHours === 0 ? null : summary.workedHours - targetHours,
      accumulated: accumulatedByDate.get(summary.date) ?? null,
      categoryBreakdown: summary.categoryBreakdown,
      location: workLocations.get(summary.date),
      note: dayNotes.get(summary.date),
      isConfirmed: summary.isConfirmed,
      leaveType: summary.leaveType,
    }
  })

  const categories = buildCategories(days, getAllCategories(config.customCategories, config.categoryOrder))
  const worked = days.reduce((s, d) => s + d.workedHours, 0)
  const targetTracked = days.reduce((s, d) => (d.workedHours > 0 ? s + d.targetHours : s), 0)
  const targetFullMonth = days.reduce((s, d) => s + d.targetHours, 0)
  const untrackedPast = days.filter((d) => d.displayStatus === 'untracked' && !d.isFuture)
  const trackedDays = days.filter((d) => d.workedHours > 0)

  const weekdayAverages = WEEKDAY_SHORT.map((weekdayShort, i) => {
    const forWeekday = trackedDays.filter((d) => d.weekday === i + 1)
    const sum = forWeekday.reduce((s, d) => s + d.workedHours, 0)
    return { weekdayShort, average: forWeekday.length > 0 ? sum / forWeekday.length : 0 }
  })

  return {
    year,
    month,
    monthLabel: new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    days,
    weeks: groupIntoWeeks(days),
    today: days.find((d) => d.isToday),
    worked,
    targetTracked,
    targetFullMonth,
    monthBalance: worked - targetTracked,
    cumulativeBalance: view.overtimeToDate.value,
    isOvertimeReady: view.isOvertimeReady,
    needsReview: days.filter((d) => d.displayStatus === 'needs-review'),
    untrackedPast,
    unconfirmed: days.filter((d) => d.workedHours > 0 && !d.isConfirmed),
    missingHours: untrackedPast.reduce((s, d) => s + d.targetHours, 0),
    categories: categories.slices,
    categoryBgOf: categories.bgOf,
    office: officeStats(summaries.days, (date) => workLocations.get(date)),
    maxDayHours: Math.max(1, ...days.map((d) => Math.max(d.workedHours, d.targetHours))),
    weekdayAverages,
    leaveDays: days.filter((d) => d.leaveType !== undefined),
  }
}
