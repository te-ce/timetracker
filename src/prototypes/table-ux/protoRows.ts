// PROTOTYPE — throwaway derivation feeding the table-UX variants. Delete with the directory.
import type { WorkLocation } from '../../infra/repositories/types'
import type { DayType } from '../../features/day/dayType'
import type { MonthView } from '../../shared/useMonthView'
import type { MonthTableRow } from '../../features/table/buildMonthTable'
import type { DisplayStatus } from '../../shared/statusColors'
import { classifyDay } from '../../shared/dayStatus'
import { targetHoursForDate } from '../../shared/weekdayHours'
import { getAllCategories } from '../../shared/categories'

export interface ProtoCategorySlice {
  cat: string
  hours: number
}

export interface ProtoDay {
  date: string
  dayNum: string
  weekday: string
  dayType: DayType
  status: DisplayStatus
  reason: string
  worked: number
  target: number
  /**
   * worked − target, but only for days the running balance actually counts: past workdays with
   * tracked hours. Null elsewhere, so a day's ± always reconciles with the balance column.
   */
  delta: number | null
  /** Running over/undertime up to and including this day. */
  cumulative: number | null
  categories: ProtoCategorySlice[]
  note: string | undefined
  location: WorkLocation
  isToday: boolean
  isFuture: boolean
  isNonWork: boolean
  isEmpty: boolean
}

function breakdownFor(row: MonthTableRow): ProtoCategorySlice[] {
  const merged: Record<string, number> = { ...row.entries }
  if (row.resolvedAutoCategory && row.autoCategoryHours > 0.001) {
    merged[row.resolvedAutoCategory] = (merged[row.resolvedAutoCategory] ?? 0) + row.autoCategoryHours
  }
  return Object.entries(merged)
    .filter(([, hours]) => hours > 0.001)
    .map(([cat, hours]) => ({ cat, hours }))
}

export function deriveProtoDays(view: MonthView): ProtoDay[] {
  const { rows, config, dayNotes, workLocations, todayIso } = view
  return rows.map((row) => {
    const manualTotal = Object.values(row.entries).reduce((s, v) => s + v, 0)
    const { displayStatus, reason } = classifyDay({
      dayType: row.dayType,
      workedHours: row.workedHours,
      manualTotal,
      isoDate: row.date,
      today: todayIso,
    })
    const target = targetHoursForDate(row.date, config.weekdayHours)
    const isFuture = row.date > todayIso
    const categories = breakdownFor(row)
    const isNonWork = row.dayType !== 'WorkDay'
    const counts = !isFuture && !isNonWork && row.workedHours > 0.001
    return {
      date: row.date,
      dayNum: row.date.slice(8),
      weekday: new Date(row.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short' }),
      dayType: row.dayType,
      status: displayStatus,
      reason,
      worked: row.workedHours,
      target,
      delta: counts ? row.workedHours - target : null,
      cumulative: row.accumulatedOvertime,
      categories,
      note: dayNotes.get(row.date),
      location: workLocations.get(row.date) ?? config.defaultWorkLocation,
      isToday: row.date === todayIso,
      isFuture,
      isNonWork,
      isEmpty: row.workedHours < 0.001 && categories.length === 0,
    }
  })
}

export function protoCategories(view: MonthView): string[] {
  return getAllCategories(view.config.customCategories, view.config.categoryOrder)
}

/** ISO-week grouping: Monday-started weeks, clipped to the month. */
export function groupByWeek(days: ProtoDay[]): { label: string; days: ProtoDay[] }[] {
  const groups: { label: string; days: ProtoDay[] }[] = []
  let current: ProtoDay[] = []
  for (const day of days) {
    const weekday = new Date(day.date + 'T12:00').getDay()
    if (weekday === 1 && current.length > 0) {
      groups.push({ label: weekLabel(current), days: current })
      current = []
    }
    current.push(day)
  }
  if (current.length > 0) groups.push({ label: weekLabel(current), days: current })
  return groups
}

function weekLabel(days: ProtoDay[]): string {
  const first = days[0]
  const last = days[days.length - 1]
  if (!first || !last) return ''
  return `${first.dayNum}–${last.dayNum}`
}

export interface WeekTotals {
  worked: number
  target: number
  delta: number
  cumulative: number | null
  categories: ProtoCategorySlice[]
}

export function totalsFor(days: ProtoDay[]): WeekTotals {
  const worked = days.reduce((s, d) => s + d.worked, 0)
  // Only the days the balance counts, so `delta` here matches the sum of the visible day ±.
  const counted = days.filter((d) => d.delta !== null)
  const target = counted.reduce((s, d) => s + d.target, 0)
  const byCat: Record<string, number> = {}
  for (const day of days) {
    for (const slice of day.categories) {
      byCat[slice.cat] = (byCat[slice.cat] ?? 0) + slice.hours
    }
  }
  const past = days.filter((d) => d.cumulative !== null)
  const lastCumulative = past.length > 0 ? (past[past.length - 1]?.cumulative ?? null) : null
  return {
    worked,
    target,
    delta: counted.reduce((s, d) => s + (d.delta ?? 0), 0),
    cumulative: lastCumulative,
    categories: Object.entries(byCat)
      .map(([cat, hours]) => ({ cat, hours }))
      .sort((a, b) => b.hours - a.hours),
  }
}
