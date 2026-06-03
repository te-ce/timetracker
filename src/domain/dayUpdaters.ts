import type { Day, WorkPeriod, WorkPeriodSlice } from '../repositories/types'

export function upsertWindow(day: Day, window: WorkPeriod): Day {
  return { ...day, windows: [...day.windows.filter((w) => w.id !== window.id), window] }
}

export function removeWindow(day: Day, id: string): Day {
  return { ...day, windows: day.windows.filter((w) => w.id !== id) }
}

export function updatePeriodCategory(day: Day, periodId: string, category: string): Day {
  return {
    ...day,
    windows: day.windows.map((w) => (w.id === periodId ? { ...w, category } : w)),
  }
}

export function upsertSlice(day: Day, periodId: string, slice: WorkPeriodSlice): Day {
  return {
    ...day,
    windows: day.windows.map((w) =>
      w.id === periodId ? { ...w, slices: [...w.slices.filter((s) => s.id !== slice.id), slice] } : w,
    ),
  }
}

export function removeSlice(day: Day, periodId: string, sliceId: string): Day {
  return {
    ...day,
    windows: day.windows.map((w) =>
      w.id === periodId ? { ...w, slices: w.slices.filter((s) => s.id !== sliceId) } : w,
    ),
  }
}
