import type { StorageAdapter } from '../../storage/adapter'
import type {
  Day,
  DatedTimeEntry,
  MonthData,
  MonthRepository,
  WorkLocation,
  WorkPeriod,
  WorkPeriodSubtask,
} from '../types'
import { JsonRecordStore } from './json-store'
import { calculateCategoryHours } from '../../../shared/periodCategories'
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
import { hasOpenPeriod, findOpenPeriod } from '../../../shared/worktime'

function monthKey(year: number, month: number): string {
  return `months/${year}-${String(month).padStart(2, '0')}.json`
}

function yearMonth(date: string): string {
  return date.slice(0, 7)
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

export class CloudMonthRepository implements MonthRepository {
  private adapter: StorageAdapter
  private stores = new Map<string, JsonRecordStore<Day>>()
  private indexStore: JsonRecordStore<true>

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
    this.indexStore = new JsonRecordStore<true>(adapter, 'months-index.json')
  }

  private getStore(year: number, month: number): JsonRecordStore<Day> {
    const key = monthKey(year, month)
    if (!this.stores.has(key)) {
      this.stores.set(key, new JsonRecordStore<Day>(this.adapter, key))
    }
    return this.stores.get(key)!
  }

  async getMonth(year: number, month: number): Promise<MonthData> {
    return this.getStore(year, month).getAll()
  }

  async updateDay(date: string, updater: (current: Day) => Day): Promise<void> {
    const year = parseInt(date.slice(0, 4))
    const month = parseInt(date.slice(5, 7))
    const store = this.getStore(year, month)
    const current = (await store.get(date)) ?? { windows: [] }
    const updated = updater(current)
    if (isDayEmpty(updated)) {
      await store.remove(date)
    } else {
      await store.set(date, updated)
      await this.indexStore.set(yearMonth(date), true)
    }
  }

  async deleteMonth(year: number, month: number): Promise<void> {
    const key = monthKey(year, month)
    await this.adapter.delete(key)
    const ym = `${year}-${String(month).padStart(2, '0')}`
    await this.indexStore.remove(ym)
    this.stores.delete(key)
  }

  async findEntriesByDateRange(from: string, to: string): Promise<DatedTimeEntry[]> {
    const fromYm = yearMonth(from)
    const toYm = yearMonth(to)
    const months = await this.getAllMonths()
    const relevant = months.filter((ym) => ym >= fromYm && ym <= toYm)
    const result: DatedTimeEntry[] = []
    for (const ym of relevant) {
      const year = parseInt(ym.slice(0, 4))
      const month = parseInt(ym.slice(5, 7))
      const data = await this.getMonth(year, month)
      for (const [date, day] of Object.entries(data)) {
        if (date >= from && date <= to) {
          const categoryHours = calculateCategoryHours(day.windows)
          for (const [category, hours] of Object.entries(categoryHours)) {
            result.push({ id: `${date}-${category}`, category, hours, date })
          }
        }
      }
    }
    return result
  }

  async getAllMonths(): Promise<string[]> {
    const index = await this.indexStore.getAll()
    return Object.keys(index).sort()
  }

  clearCache(): void {
    for (const store of this.stores.values()) {
      store.clearCache()
    }
    this.indexStore.clearCache()
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
