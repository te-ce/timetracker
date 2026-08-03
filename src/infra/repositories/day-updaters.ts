import type { Day, WorkPeriod, WorkPeriodSubtask } from './types'
import { calcSubtaskHours } from '../../shared/worktime'

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

export function upsertSubtask(day: Day, periodId: string, subtask: WorkPeriodSubtask): Day {
  return {
    ...day,
    windows: day.windows.map((w) => {
      if (w.id !== periodId) return w
      const idx = w.subtasks.findIndex((s) => s.id === subtask.id)
      if (idx >= 0) {
        const subtasks = [...w.subtasks]
        subtasks[idx] = subtask
        return { ...w, subtasks }
      }
      return { ...w, subtasks: [...w.subtasks, subtask] }
    }),
  }
}

export function removeSubtask(day: Day, periodId: string, subtaskId: string): Day {
  return {
    ...day,
    windows: day.windows.map((w) =>
      w.id === periodId ? { ...w, subtasks: w.subtasks.filter((s) => s.id !== subtaskId) } : w,
    ),
  }
}

export function startLiveSubtask(
  day: Day,
  periodId: string,
  newSubtask: WorkPeriodSubtask & { startedAt: string },
): Day {
  return {
    ...day,
    windows: day.windows.map((w) => {
      if (w.id !== periodId) return w
      const settled = w.subtasks.map((s) => {
        if (!s.startedAt || s.stoppedAt) return s
        return { ...s, hours: calcSubtaskHours(s.startedAt, newSubtask.startedAt), stoppedAt: newSubtask.startedAt }
      })
      return { ...w, subtasks: [...settled, newSubtask] }
    }),
  }
}

export function stopLiveSubtask(day: Day, periodId: string, subtaskId: string, stoppedAt: string): Day {
  return {
    ...day,
    windows: day.windows.map((w) => {
      if (w.id !== periodId) return w
      const updatedSubtasks = w.subtasks.map((s) => {
        if (s.id !== subtaskId || !s.startedAt) return s
        return { ...s, hours: calcSubtaskHours(s.startedAt, stoppedAt), stoppedAt }
      })
      const newEnd = w.end !== null && stoppedAt > w.end ? stoppedAt : w.end
      return { ...w, subtasks: updatedSubtasks, end: newEnd }
    }),
  }
}

export function resumeSubtask(day: Day, periodId: string, subtaskId: string, now: string): Day {
  return {
    ...day,
    windows: day.windows.map((w) => {
      if (w.id !== periodId) return w
      const target = w.subtasks.find((s) => s.id === subtaskId)
      if (!target?.startedAt) return w
      const subtasks = w.subtasks.map((s) => {
        if (s.id === subtaskId) return { ...s, stoppedAt: undefined }
        if (!s.startedAt || s.stoppedAt) return s
        return { ...s, hours: calcSubtaskHours(s.startedAt, now), stoppedAt: now }
      })
      return { ...w, subtasks, end: null }
    }),
  }
}

export function stopPeriod(
  day: Day,
  periodId: string,
  endTime: string,
  liveSubtaskId?: string,
  stoppedAt?: string,
): Day {
  const withSubtaskStopped = liveSubtaskId && stoppedAt ? stopLiveSubtask(day, periodId, liveSubtaskId, stoppedAt) : day
  return {
    ...withSubtaskStopped,
    windows: withSubtaskStopped.windows.map((w) => (w.id === periodId ? { ...w, end: endTime } : w)),
  }
}
