import type { Day, WorkPeriod, WorkPeriodSlice } from '../repositories/types'
import { calcSliceHours } from './worktime'

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

export function startLiveSlice(day: Day, periodId: string, newSlice: WorkPeriodSlice & { startedAt: string }): Day {
  return {
    ...day,
    windows: day.windows.map((w) => {
      if (w.id !== periodId) return w
      const settled = w.slices.map((s) => {
        if (!s.startedAt) return s
        return { ...s, hours: calcSliceHours(s.startedAt, newSlice.startedAt), startedAt: undefined }
      })
      return { ...w, slices: [...settled, newSlice] }
    }),
  }
}

export function stopLiveSlice(day: Day, periodId: string, sliceId: string, stoppedAt: string): Day {
  return {
    ...day,
    windows: day.windows.map((w) => {
      if (w.id !== periodId) return w
      return {
        ...w,
        slices: w.slices.map((s) => {
          if (s.id !== sliceId || !s.startedAt) return s
          return { ...s, hours: calcSliceHours(s.startedAt, stoppedAt), startedAt: undefined }
        }),
      }
    }),
  }
}

export function stopPeriod(day: Day, periodId: string, endTime: string, liveSliceId?: string, stoppedAt?: string): Day {
  const withSliceStopped = liveSliceId && stoppedAt ? stopLiveSlice(day, periodId, liveSliceId, stoppedAt) : day
  return {
    ...withSliceStopped,
    windows: withSliceStopped.windows.map((w) => (w.id === periodId ? { ...w, end: endTime } : w)),
  }
}
