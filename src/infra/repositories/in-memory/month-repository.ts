import type {
  Day,
  DatedTimeEntry,
  MonthData,
  MonthRepository,
  WorkLocation,
  WorkPeriod,
  WorkPeriodSubtask,
} from '../types'
import { calculateCategoryHours } from '../../../shared/periodCategories'
import { hasOpenPeriod, findOpenPeriod } from '../../../shared/worktime'
import {
  upsertWindow,
  removeWindow,
  updatePeriodCategory,
  upsertSubtask,
  removeSubtask,
  startLiveSubtask as doStartLiveSubtask,
  stopLiveSubtask as doStopLiveSubtask,
  stopPeriod as doStopPeriod,
} from '../../../features/day/dayUpdaters'
import { mergeAdjacentInto } from '../../../features/day/workPeriodMerge'

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function isDayEmpty(day: Day): boolean {
  return (
    day.windows.length === 0 &&
    day.location === undefined &&
    !day.confirmed &&
    !day.note &&
    !day.autoCategoryOverride &&
    !day.dayTypeOverride
  )
}

export class InMemoryMonthRepository implements MonthRepository {
  private months = new Map<string, MonthData>()

  constructor(initial: Record<string, MonthData> = {}) {
    for (const [ym, data] of Object.entries(initial)) {
      this.months.set(ym, structuredClone(data))
    }
  }

  getMonth(year: number, month: number): Promise<MonthData> {
    return Promise.resolve(structuredClone(this.months.get(monthKey(year, month)) ?? {}))
  }

  updateDay(date: string, updater: (current: Day) => Day): Promise<void> {
    const ym = date.slice(0, 7)
    const data = structuredClone(this.months.get(ym) ?? {})
    const current = data[date] ?? { windows: [] }
    const updated = updater(current)
    if (isDayEmpty(updated)) {
      delete data[date]
    } else {
      data[date] = updated
    }
    this.months.set(ym, data)
    return Promise.resolve()
  }

  deleteMonth(year: number, month: number): Promise<void> {
    this.months.delete(monthKey(year, month))
    return Promise.resolve()
  }

  findEntriesByDateRange(from: string, to: string): Promise<DatedTimeEntry[]> {
    const result: DatedTimeEntry[] = []
    for (const [, data] of this.months) {
      for (const [date, day] of Object.entries(data)) {
        if (date >= from && date <= to) {
          const categoryHours = calculateCategoryHours(day.windows)
          for (const [category, hours] of Object.entries(categoryHours)) {
            result.push({ id: `${date}-${category}`, category, hours, date })
          }
        }
      }
    }
    return Promise.resolve(result)
  }

  getAllMonths(): Promise<string[]> {
    return Promise.resolve([...this.months.keys()].sort())
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
    return this.updateDay(date, (day) => removeSubtask(day, periodId, subtaskId))
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
    const openPeriod = findOpenPeriod(dayWindows)
    if (!openPeriod) return
    const latest = openPeriod
    const closed = { ...latest, end: now, category }
    const { merged, absorbed } = mergeAdjacentInto(dayWindows, closed)
    await this.updateDay(date, (day) => ({
      ...day,
      windows: [...day.windows.filter((w) => w.id !== merged.id && !absorbed.includes(w.id)), merged],
    }))
  }
}
