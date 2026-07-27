import type {
  Day,
  DatedTimeEntry,
  MonthData,
  MonthRepository,
  WorkLocation,
  WorkPeriod,
  WorkPeriodSubtask,
} from './types'
import { calculateDayCategoryHours } from '../../shared/periodCategories'
import type { WeekdayHours } from '../../shared/weekdayHours'
import { hasOpenPeriod, findOpenPeriod } from '../../shared/worktime'
import {
  upsertWindow,
  removeWindow,
  updatePeriodCategory,
  upsertSubtask,
  removeSubtask as removeSubtaskFromDay,
  startLiveSubtask as doStartLiveSubtask,
  stopLiveSubtask as doStopLiveSubtask,
  stopPeriod as doStopPeriod,
} from '../../features/day/dayUpdaters'
import { mergeAdjacentInto } from '../../features/day/workPeriodMerge'

export function isDayEmpty(day: Day): boolean {
  return (
    day.windows.length === 0 &&
    day.location === undefined &&
    !day.confirmed &&
    !day.note &&
    !day.autoCategoryOverride &&
    !day.dayTypeOverride
  )
}

/**
 * Shared business logic for both MonthRepository adapters. The only real seam
 * between Cloud (OneDrive-backed JSON files) and InMemory (test double) is how
 * a month is read and how a day update is persisted — everything else (the ~14
 * mutation verbs) is storage-agnostic and was previously duplicated verbatim
 * across both implementations.
 */
export abstract class AbstractMonthRepository implements MonthRepository {
  abstract getMonth(year: number, month: number): Promise<MonthData>
  abstract updateDay(date: string, updater: (current: Day) => Day): Promise<void>
  abstract deleteMonth(year: number, month: number): Promise<void>
  abstract getAllMonths(): Promise<string[]>

  async findEntriesByDateRange(from: string, to: string, weekdayHours: WeekdayHours): Promise<DatedTimeEntry[]> {
    const fromYm = from.slice(0, 7)
    const toYm = to.slice(0, 7)
    const months = await this.getAllMonths()
    const relevant = months.filter((ym) => ym >= fromYm && ym <= toYm)
    const perMonth = await Promise.all(
      relevant.map(async (ym) => {
        const year = parseInt(ym.slice(0, 4))
        const month = parseInt(ym.slice(5, 7))
        const data = await this.getMonth(year, month)
        const entries: DatedTimeEntry[] = []
        for (const [date, day] of Object.entries(data)) {
          if (date >= from && date <= to) {
            const categoryHours = calculateDayCategoryHours(day, date, weekdayHours)
            for (const [category, hours] of Object.entries(categoryHours)) {
              entries.push({ id: `${date}-${category}`, category, hours, date })
            }
          }
        }
        return entries
      }),
    )
    return perMonth.flat()
  }

  confirmDay(date: string): Promise<void> {
    return this.updateDay(date, (day) => ({ ...day, confirmed: true }))
  }

  unconfirmDay(date: string): Promise<void> {
    return this.updateDay(date, (day) => ({ ...day, confirmed: false }))
  }

  toggleLocation(date: string, currentEffectiveLocation: WorkLocation): Promise<void> {
    const next: WorkLocation = currentEffectiveLocation === 'Remote' ? 'Office' : 'Remote'
    return this.updateDay(date, (day) => ({ ...day, location: next }))
  }

  saveNote(date: string, note: string): Promise<void> {
    return this.updateDay(date, (day) => {
      const updated = { ...day }
      delete updated.note
      return note ? { ...updated, note } : updated
    })
  }

  resetDay(date: string): Promise<void> {
    return this.updateDay(date, () => ({ windows: [] }))
  }

  saveWorkPeriod(date: string, window: WorkPeriod): Promise<void> {
    return this.updateDay(date, (day) => upsertWindow(day, window))
  }

  saveWorkPeriodWithAbsorbed(date: string, window: WorkPeriod, absorbed: string[]): Promise<void> {
    return this.updateDay(date, (day) => {
      const withoutAbsorbed = { ...day, windows: day.windows.filter((w) => !absorbed.includes(w.id)) }
      return upsertWindow(withoutAbsorbed, window)
    })
  }

  removeWorkPeriod(date: string, id: string): Promise<void> {
    return this.updateDay(date, (day) => removeWindow(day, id))
  }

  setPeriodCategory(date: string, periodId: string, category: string): Promise<void> {
    return this.updateDay(date, (day) => updatePeriodCategory(day, periodId, category))
  }

  addSubtask(date: string, periodId: string, subtask: WorkPeriodSubtask): Promise<void> {
    return this.updateDay(date, (day) => upsertSubtask(day, periodId, subtask))
  }

  removeSubtask(date: string, periodId: string, subtaskId: string): Promise<void> {
    return this.updateDay(date, (day) => removeSubtaskFromDay(day, periodId, subtaskId))
  }

  startLiveSubtask(date: string, periodId: string, subtask: WorkPeriodSubtask & { startedAt: string }): Promise<void> {
    return this.updateDay(date, (day) => doStartLiveSubtask(day, periodId, subtask))
  }

  stopLiveSubtask(date: string, periodId: string, subtaskId: string, stoppedAt: string): Promise<void> {
    return this.updateDay(date, (day) => doStopLiveSubtask(day, periodId, subtaskId, stoppedAt))
  }

  stopWorkPeriod(
    date: string,
    periodId: string,
    endTime: string,
    liveSubtaskId?: string,
    stoppedAt?: string,
  ): Promise<void> {
    return this.updateDay(date, (day) => doStopPeriod(day, periodId, endTime, liveSubtaskId, stoppedAt))
  }

  async openWorkPeriod(date: string, category: string, now: string): Promise<void> {
    const year = parseInt(date.slice(0, 4))
    const month = parseInt(date.slice(5, 7))
    const monthData = await this.getMonth(year, month)
    if (hasOpenPeriod(monthData[date]?.windows ?? [])) return
    await this.updateDay(date, (day) => ({
      ...day,
      windows: [...day.windows, { id: crypto.randomUUID(), start: now, end: null, category, subtasks: [] }],
    }))
  }

  async closeOpenWorkPeriod(date: string, category: string, now: string): Promise<void> {
    const year = parseInt(date.slice(0, 4))
    const month = parseInt(date.slice(5, 7))
    const monthData = await this.getMonth(year, month)
    const dayWindows = monthData[date]?.windows ?? []
    const latest = findOpenPeriod(dayWindows)
    if (!latest) return
    const closed = { ...latest, end: now, category }
    const { merged, absorbed } = mergeAdjacentInto(dayWindows, closed)
    await this.updateDay(date, (day) => ({
      ...day,
      windows: [...day.windows.filter((w) => w.id !== merged.id && !absorbed.includes(w.id)), merged],
    }))
  }
}
